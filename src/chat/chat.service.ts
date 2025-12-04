// src/chat/chat.service.ts
import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConversationsService } from "../conversations/conversations.service";
import {
  LlmMessage,
  LlmOrchestratorService,
} from "../llm/llm-orchestrator.service";
import { MessageRole } from "../conversations/message-role.enum";
import {
  ChatAttachmentDto,
  ChatAttachmentType,
} from "./dto/chat-attachment.dto";
import { PromptService } from "../prompts/prompt.service";
import { PdfIngestionService } from "../doc-ingestion/pdf-ingestion.service";
import { DocxIngestionService } from "../doc-ingestion/docx-ingestion.service";
import { CsvIngestionService } from "../doc-ingestion/csv-ingestion.service";

import {
  ProductsService,
  ChatProductSearchFilters,
} from "../products/products.service";

type ChatAuthMode = "none" | "local" | "oauth2";

interface CarQueryAnalysis {
  wantsCars: boolean;
  categorySlug?: string | null;
  brand?: string | null;
  fuelType?: string | null;
  gearbox?: string | null;
  maxPrice?: number | null;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly config: ConfigService,
    private readonly llm: LlmOrchestratorService,
    private readonly promptService: PromptService,
    private readonly pdfIngestion: PdfIngestionService,
    private readonly docxIngestion: DocxIngestionService,
    private readonly csvIngestion: CsvIngestionService,
    private readonly productsService: ProductsService
  ) {}

  async *streamMessage(params: {
    userId: string | null;
    conversationId?: string | null;
    message: string;
    attachments?: ChatAttachmentDto[];
  }): AsyncGenerator<string> {
    const chatAuthMode =
      (this.config.get<string>("CHAT_AUTH_MODE") as ChatAuthMode) || "none";

    const tenantId = this.config.get<string>("APP_ID") ?? "global";
    const baseSystemPrompt = await this.promptService.getSystemPrompt({
      tenantId,
    });

    // ==========================
    // 1) MODO PÚBLICO (sin auth)
    // ==========================
    if (chatAuthMode === "none" || !params.userId) {
      if (params.attachments && params.attachments.length > 0) {
        throw new BadRequestException(
          "Adjuntos no permitidos cuando el chat no requiere autenticación"
        );
      }

      // Usamos el helper que decide si tira del catálogo de coches o no
      for await (const delta of this.generateWithOptionalCatalog({
        systemPrompt: baseSystemPrompt,
        userMessage: params.message,
        userId: null,
        conversationId: null,
      })) {
        yield delta;
      }

      return;
    }

    // ==========================
    // 2) MODO CON AUTH
    // ==========================
    const userId = params.userId;
    let conversationIdToUse: string;

    if (params.conversationId) {
      const existing = await this.conversationsService.findConversationForUser(
        params.conversationId,
        userId
      );
      if (!existing) {
        const conv = await this.conversationsService.createConversationForUser(
          userId,
          { title: "Nueva conversación", channel: "widget-web" }
        );
        const id = (conv as any).id ?? (conv as any)._id?.toString();
        conversationIdToUse = id;
      } else {
        const id = (existing as any).id ?? (existing as any)._id?.toString();
        conversationIdToUse = id;
      }
    } else {
      const conv = await this.conversationsService.createConversationForUser(
        userId,
        { title: "Nueva conversación", channel: "widget-web" }
      );
      const id = (conv as any).id ?? (conv as any)._id?.toString();
      conversationIdToUse = id;
    }

    // ==========================================
    // 3) Normalizamos adjuntos (tipo + metadatos)
    // ==========================================
    const normalizedAttachments: ChatAttachmentDto[] = (
      params.attachments ?? []
    ).map((a) => {
      // Si ya viene el type (file/image/link/other), lo respetamos.
      if (a.type) {
        return a;
      }

      const isImage =
        a.mimeType?.startsWith("image/") ||
        a.filename?.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/i);

      // 👇 Cast explícito para contentar a TypeScript
      const inferredType = (isImage ? "image" : "file") as ChatAttachmentType;

      return {
        ...a,
        type: inferredType,
      };
    });

    // Guardamos mensaje del usuario
    await this.conversationsService.addMessage({
      conversationId: conversationIdToUse,
      role: MessageRole.USER,
      content: params.message,
      attachments: normalizedAttachments,
    });

    // =======================================
    // 4) Extraemos texto de PDFs / DOCX / CSV
    // =======================================
    const pdfAttachments = normalizedAttachments.filter(
      (a) =>
        a.mimeType === "application/pdf" ||
        a.filename?.toLowerCase().endsWith(".pdf")
    );

    const docxAttachments = normalizedAttachments.filter((a) =>
      a.filename?.toLowerCase().match(/\.(docx|doc)$/)
    );

    const csvAttachments = normalizedAttachments.filter((a) =>
      a.filename?.toLowerCase().match(/\.(csv|xls|xlsx)$/)
    );

    let extraContext = "";

    // PDFs
    for (const pdf of pdfAttachments) {
      if (!pdf.url) continue;
      const text = await this.pdfIngestion.extractTextFromPdfUrl(pdf.url, {
        maxChars: 6000,
      });
      if (text) {
        extraContext += `\n\n=== Contenido del PDF: ${
          pdf.filename ?? pdf.url
        } ===\n${text}`;
      }
    }

    // DOCX / DOC
    for (const doc of docxAttachments) {
      if (!doc.url) continue;
      const text = await this.docxIngestion.extractTextFromDocxUrl(doc.url, {
        maxChars: 6000,
      });
      if (text) {
        extraContext += `\n\n=== Contenido del DOC/DOCX: ${
          doc.filename ?? doc.url
        } ===\n${text}`;
      }
    }

    // CSV / Excel
    for (const csv of csvAttachments) {
      if (!csv.url) continue;
      const text = await this.csvIngestion.extractTextFromCsvUrl(csv.url, {
        maxChars: 6000,
      });
      if (text) {
        extraContext += `\n\n=== Contenido del CSV/XLS(X): ${
          csv.filename ?? csv.url
        } ===\n${text}`;
      }
    }

    let enrichedPrompt = baseSystemPrompt;

    if (extraContext) {
      enrichedPrompt =
        baseSystemPrompt +
        "\n\n---\n" +
        "El usuario ha adjuntado uno o varios documentos (PDF/DOCX/CSV). " +
        "A continuación tienes el texto extraído para que lo uses al responder:\n" +
        extraContext;
    }

    // =======================================
    // 5) Imágenes → se pasan al LLM (visión)
    // =======================================
    const imageUrls = normalizedAttachments
      .filter(
        (a) =>
          a.type === "image" ||
          a.mimeType?.startsWith("image/") ||
          a.filename?.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/i)
      )
      .map((a) => a.url)
      .filter((u): u is string => !!u);

    let fullAssistantText = "";

    // Usamos el helper que decide si tirar del catálogo de coches o no
    for await (const delta of this.generateWithOptionalCatalog({
      systemPrompt: enrichedPrompt,
      userMessage: params.message,
      userId,
      conversationId: conversationIdToUse,
      imageUrls: imageUrls.length ? imageUrls : undefined,
    })) {
      fullAssistantText += delta;
      yield delta;
    }

    // =======================================
    // 6) Guardamos la respuesta del asistente
    // =======================================
    await this.conversationsService.addMessage({
      conversationId: conversationIdToUse,
      role: MessageRole.ASSISTANT,
      content: fullAssistantText,
      attachments: [],
    });
  }

  private async extractCarFilters(
    userMessage: string
  ): Promise<CarQueryAnalysis | null> {
    const systemPrompt = `
Eres un analizador de consultas de un usuario que puede estar buscando coches
de un catálogo interno.

Tu único trabajo es decidir si la consulta del usuario está relacionada con
buscar o recomendar coches del catálogo, y extraer filtros básicos.

Debes devolver EXCLUSIVAMENTE un JSON con este formato:

{
  "wantsCars": boolean,
  "categorySlug": string | null,   // "suv", "berlina", "compacto", etc. en minúsculas
  "brand": string | null,          // marca si se menciona (ej. "Toyota")
  "fuelType": string | null,       // "gasolina", "diésel", "híbrido", "eléctrico"
  "gearbox": string | null,        // "manual" o "automático"
  "maxPrice": number | null        // precio máximo en euros
}

REGLAS IMPORTANTES:
- "wantsCars" = true SIEMPRE que el usuario hable de:
  - coche, coches, vehículo, vehiculo, auto, automóvil, automovil
  - SUV, todocamino, todoterreno, berlina, compacto, monovolumen, furgoneta
  - pedir recomendación de un coche, modelo, coche familiar, coche para ciudad, etc.
- Solo "wantsCars" = false cuando la pregunta NO tiene nada que ver con coches.

EJEMPLOS (wantsCars = true):
- "Quiero un SUV por menos de 25.000 euros" → categorySlug: "suv", maxPrice: 25000
- "Busco un coche compacto para ciudad, a buen precio" → categorySlug: "compacto"
- "¿Qué berlina eléctrica me recomiendas?" → categorySlug: "berlina", fuelType: "eléctrico"
- "Tenéis algún Toyota híbrido?" → brand: "Toyota", fuelType: "híbrido"

EJEMPLOS (wantsCars = false):
- "Explícame la diferencia entre IA generativa y un CRM"
- "¿Qué es NERIA?"

Responde SOLO con el JSON, sin texto adicional.
`.trim();

    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    let raw = "";

    // usamos el orquestador normal, pero acumulando todo el texto
    for await (const delta of this.llm.streamChat({
      messages,
      temperature: 0,
      maxTokens: 300,
      userId: null,
      conversationId: null,
    })) {
      raw += delta;
    }

    // Intentamos sacar JSON aunque venga envuelto
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    const jsonText = raw.slice(start, end + 1);

    try {
      const parsed = JSON.parse(jsonText) as Partial<CarQueryAnalysis>;
      return {
        wantsCars: !!parsed.wantsCars,
        categorySlug: parsed.categorySlug ?? null,
        brand: parsed.brand ?? null,
        fuelType: parsed.fuelType ?? null,
        gearbox: parsed.gearbox ?? null,
        maxPrice: parsed.maxPrice ?? null,
      };
    } catch {
      return null;
    }
  }

  private async *generateWithOptionalCatalog(params: {
    systemPrompt: string;
    userMessage: string;
    userId: string | null;
    conversationId: string | null;
    imageUrls?: string[];
  }): AsyncGenerator<string> {
    const { systemPrompt, userMessage, userId, conversationId, imageUrls } =
      params;

    // 1) Intentamos ver si es una consulta de coches y sacar filtros
    const analysis = await this.extractCarFilters(userMessage);

    // Heurística extra por si el modelo se lía
    const lower = userMessage.toLowerCase();
    const heuristicWantsCars =
      /coche|coches|vehiculo|vehículo|auto|automovil|automóvil|suv|berlina|compacto|todoterreno|todocamino/.test(
        lower
      );

    const wantsCars = analysis?.wantsCars ?? heuristicWantsCars;

    // Bloque DEBUG base (lo veremos en la respuesta para entender qué pasa)
    const debugBase = {
      analysis,
      heuristicWantsCars,
      wantsCars,
    };

    if (!wantsCars) {
      // 🔸 No va de coches → flujo normal, pero metemos info DEBUG para ver qué ha pensado
      const debugInfo = JSON.stringify(debugBase, null, 2);

      const messages: LlmMessage[] = [
        {
          role: "system",
          content:
            systemPrompt +
            "\n\n[DEBUG INTERNO - CATALOGO COCHES]\n" +
            debugInfo +
            "\n\nNO menciones esta sección DEBUG al usuario final. Solo úsala para entender el contexto.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ];

      for await (const delta of this.llm.streamChat({
        messages,
        userId: userId ?? undefined,
        conversationId: conversationId ?? undefined,
        imageUrls: imageUrls && imageUrls.length ? imageUrls : undefined,
      })) {
        yield delta;
      }
      return;
    }

    // 2) Sí va de coches → usamos catálogo
    const filters: ChatProductSearchFilters = {
      categorySlug:
        analysis?.categorySlug ||
        (lower.includes("suv") ? "suv" : undefined) ||
        (lower.includes("berlina") ? "berlina" : undefined) ||
        (lower.includes("compacto") ? "compacto" : undefined),
      brand: analysis?.brand || undefined,
      fuelType: analysis?.fuelType || undefined,
      gearbox: analysis?.gearbox || undefined,
      maxPrice: analysis?.maxPrice || undefined,
      limit: 5,
    };

    const products = await this.productsService.searchForChat(filters);

    // ✅ Transformamos productos a un shape específico para el chat,
    //   incluyendo mainImage = última imagen del array (o imageUrl si no hay array).
    const productsForChat = products.map((p) => {
      const images = p.images ?? [];
      const hasImagesArray = Array.isArray(images) && images.length > 0;

      const mainImage = hasImagesArray
        ? images[images.length - 1] // 👈 última del array
        : (p.imageUrl ?? null); // fallback

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        model: p.model,
        year: p.year,
        price: p.price,
        mileage: p.mileage,
        category: p.vehicleCategory?.name,
        categorySlug: p.vehicleCategory?.slug,
        fuelType: p.fuelType,
        gearbox: p.gearbox,
        seats: p.seats,
        doors: p.doors,
        color: p.color,
        description: p.description,
        mainImage, // 👈 aquí va la lógica que pedías
      };
    });

    const debugInfo = JSON.stringify(
      {
        ...debugBase,
        filters,
        productsCount: products.length,
      },
      null,
      2
    );

    const systemForAnswer =
      systemPrompt +
      "\n\n" +
      "INSTRUCCIONES ESPECÍFICAS PARA CONSULTAS DE COCHES:\n" +
      "- Dispones de un catálogo interno de coches proporcionado en formato JSON en el mensaje del usuario.\n" +
      "- Esos datos (modelos, precios, combustible, categoría...) proceden de la base de datos del cliente y SON FIABLES.\n" +
      "- Debes basar tus recomendaciones EXCLUSIVAMENTE en ese JSON.\n" +
      "- Cada coche tiene un campo 'mainImage' que ya contiene la URL de UNA sola imagen para mostrar al usuario.\n" +
      "- Cuando recomiendes coches, deja claro que forman parte de NUESTRO CATÁLOGO, usando expresiones como\n" +
      '  \"de nuestro catálogo de SUV\", \"de nuestro catálogo de vehículos\" o similares.\n' +
      "- Siempre que tenga sentido, puedes empezar la respuesta con una frase del estilo:\n" +
      '  \"Te recomiendo X opciones de nuestro catálogo de SUV que se ajustan a tu presupuesto de Y euros:\".\n' +
      "- Si el listado NO está vacío, está TERMINANTEMENTE PROHIBIDO decir frases como\n" +
      '  \"no tengo acceso a información actualizada\" o similares. En su lugar, recomienda modelos concretos del catálogo.\n' +
      "- Si el listado está vacío, explícale al usuario que ahora mismo no hay coches que cumplan sus filtros y sugiérele cambios razonables (más presupuesto, otra categoría, etc.).\n" +
      "- Para mostrar la imagen de un coche, usa la sintaxis Markdown: `![Nombre del coche](URL_DE_mainImage)`.\n";

    const userContent =
      `Pregunta del usuario:\n` +
      userMessage +
      `\n\n` +
      `A continuación tienes la lista de coches del CATÁLOGO INTERNO que cumplen (o casi cumplen) los filtros del usuario, en formato JSON.\n` +
      `Cada coche incluye un campo 'mainImage' con UNA sola URL lista para usar en la respuesta:\n` +
      JSON.stringify(productsForChat, null, 2) +
      `\n\n` +
      `Si la lista está vacía ([]), dile al usuario que no hay coches que cumplan exactamente sus filtros y sugiérele ajustes.\n` +
      `Si la lista NO está vacía, DEBES recomendar modelos concretos de esta lista (menciona marca, modelo, precio, tipo de combustible y usa 'mainImage' para mostrar una imagen en Markdown).`;
    const messages: LlmMessage[] = [
      { role: "system", content: systemForAnswer },
      { role: "user", content: userContent },
    ];

    for await (const delta of this.llm.streamChat({
      messages,
      userId: userId ?? undefined,
      conversationId: conversationId ?? undefined,
      imageUrls: imageUrls && imageUrls.length ? imageUrls : undefined,
    })) {
      yield delta;
    }
  }
}

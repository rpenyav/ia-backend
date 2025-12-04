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

    // Bloque DEBUG base (para logs si hiciera falta)
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
      const images = (p as any).images ?? [];
      const hasImagesArray = Array.isArray(images) && images.length > 0;

      const mainImage = hasImagesArray
        ? images[images.length - 1] // última del array
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
        mainImage,
        productLink: (p as any).productLink ?? null,
      };
    });

    // Plantilla HTML para la card del coche
    const carHtmlTemplate = `
<div class="iachat-car-card">
  <p class="iachat-car-card-intro">[TEXTO_INTRO]</p>
  <div class="iachat-car-card-body">
    <div class="iachat-car-card-left">
      <img src="[MAIN_IMAGE_URL]" alt="[NOMBRE_COMPLETO]" class="iachat-car-card-image" />
      <!-- Si NO hay productLink, NO incluyas este enlace -->
      <a href="[PRODUCT_LINK]" target="_blank" rel="noopener noreferrer" class="iachat-car-card-link">
        <span class="iachat-car-card-link-icon">✓</span>
        <span>Ficha del vehículo</span>
      </a>
    </div>
    <div class="iachat-car-card-right">
      <h3 class="iachat-car-card-title">[NOMBRE_COMPLETO]</h3>
      <ul class="iachat-car-card-list">
        <li><strong>Precio:</strong> [PRECIO]</li>
        <li><strong>Tipo de combustible:</strong> [COMBUSTIBLE]</li>
        <li><strong>Kilometraje:</strong> [KILOMETRAJE]</li>
        <li><strong>Categoría:</strong> [CATEGORIA]</li>
        <li><strong>Asientos:</strong> [ASIENTOS]</li>
        <li><strong>Puertas:</strong> [PUERTAS]</li>
        <li><strong>Color:</strong> [COLOR]</li>
        <li><strong>Descripción:</strong> [DESCRIPCION]</li>
      </ul>
    </div>
  </div>
</div>
`.trim();

    const systemForAnswer =
      systemPrompt +
      "\n\n" +
      "INSTRUCCIONES ESPECÍFICAS PARA CONSULTAS DE COCHES (SALIDA HTML):\n" +
      "- Dispones de un catálogo interno de coches proporcionado en formato JSON en el mensaje del usuario.\n" +
      "- Esos datos proceden de la base de datos del cliente y SON FIABLES.\n" +
      "- Debes basar tus recomendaciones EXCLUSIVAMENTE en ese JSON.\n" +
      "- Cuando respondas sobre coches, tu salida debe ser SIEMPRE un ÚNICO bloque HTML con ESTA PLANTILLA (rellenando los huecos entre corchetes):\n\n" +
      carHtmlTemplate +
      "\n\n" +
      "REGLAS DE FORMATO MUY IMPORTANTES:\n" +
      '- No escribas NADA fuera del <div class="iachat-car-card">...</div>.\n' +
      "- Sustituye [TEXTO_INTRO], [NOMBRE_COMPLETO], [PRECIO], etc. por los datos reales del coche recomendado.\n" +
      "- Usa el coche que mejor encaje con la búsqueda (normalmente el primero de la lista).\n" +
      "- [MAIN_IMAGE_URL] debe ser la propiedad 'mainImage' del coche.\n" +
      "- Si 'productLink' es null o no existe, ELIMINA completamente el enlace <a> (no pongas un enlace vacío).\n" +
      "- Si 'productLink' tiene valor, usa exactamente ese valor en href.\n" +
      "- No añadas párrafos extras ni texto después del bloque HTML.\n";

    const userContent =
      `Pregunta del usuario:\n` +
      userMessage +
      `\n\n` +
      `A continuación tienes la lista de coches del CATÁLOGO INTERNO que cumplen (o casi cumplen) los filtros del usuario, en formato JSON.\n` +
      `Cada coche incluye un campo 'mainImage' con UNA sola URL de imagen lista para usar y, opcionalmente, 'productLink' con la URL de la ficha en la web:\n` +
      JSON.stringify(productsForChat, null, 2) +
      `\n\n` +
      `Si la lista está vacía ([]), indica en el HTML que no hay coches que cumplan exactamente sus filtros y sugiérele ajustes (más presupuesto, otra categoría, etc.), pero mantén la estructura del div.\n` +
      `Si la lista NO está vacía, rellena la plantilla HTML con los datos de un coche de la lista.`;

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

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
      if (a.type) {
        return a;
      }

      const isImage =
        a.mimeType?.startsWith("image/") ||
        a.filename?.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/i);

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

  // =====================================================
  // ANALIZADOR DE CONSULTA (¿es búsqueda de coches?)
  // =====================================================
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
  "categorySlug": string | null,
  "brand": string | null,
  "fuelType": string | null,
  "gearbox": string | null,
  "maxPrice": number | null
}

REGLAS IMPORTANTES:
- "wantsCars" = true SIEMPRE que el usuario hable de:
  - coche, coches, vehículo, vehiculo, auto, automóvil, automovil
  - SUV, todocamino, todoterreno, berlina, compacto, monovolumen, furgoneta
  - pedir recomendación de un coche, modelo, coche familiar, coche para ciudad, etc.
- Solo "wantsCars" = false cuando la pregunta NO tiene nada que ver con coches.

Responde SOLO con el JSON, sin texto adicional.
`.trim();

    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    let raw = "";

    for await (const delta of this.llm.streamChat({
      messages,
      temperature: 0,
      maxTokens: 300,
      userId: null,
      conversationId: null,
    })) {
      raw += delta;
    }

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

  // =====================================================
  // ORQUESTADOR: CON / SIN CATÁLOGO
  // =====================================================
  private async *generateWithOptionalCatalog(params: {
    systemPrompt: string;
    userMessage: string;
    userId: string | null;
    conversationId: string | null;
    imageUrls?: string[];
  }): AsyncGenerator<string> {
    const { systemPrompt, userMessage, userId, conversationId, imageUrls } =
      params;

    const analysis = await this.extractCarFilters(userMessage);

    const lower = userMessage.toLowerCase();
    const heuristicWantsCars =
      /coche|coches|vehiculo|vehículo|auto|automovil|automóvil|suv|berlina|compacto|todoterreno|todocamino/.test(
        lower
      );

    const wantsCars = analysis?.wantsCars ?? heuristicWantsCars;

    // =============================
    // CASO 1: NO ES BÚSQUEDA DE COCHES
    // =============================
    if (!wantsCars) {
      const messages: LlmMessage[] = [
        {
          role: "system",
          content: systemPrompt,
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

    // =============================
    // CASO 2: SÍ ES BÚSQUEDA DE COCHES → USAMOS CATÁLOGO
    // =============================
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

    if (!products.length) {
      const noResultsText = `No he encontrado coches en nuestro catálogo que cumplan exactamente con tu búsqueda. 

Te recomiendo ampliar un poco el presupuesto, ser flexible con el año o probar con otra categoría (por ejemplo, compacto, SUV o berlina) para que pueda ofrecerte alternativas.`;
      yield noResultsText;
      return;
    }

    // Normalizamos para el meta JSON
    const productsForChat = products.map((p) => {
      const images = (p as any).images ?? [];
      const hasImagesArray = Array.isArray(images) && images.length > 0;

      const mainImage = hasImagesArray
        ? images[images.length - 1]
        : (p.imageUrl ?? null);

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        model: p.model,
        year: p.year,
        // ojo: price puede venir como string por DECIMAL
        price: p.price as any,
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

    // De momento usamos el primer coche como mejor match
    const car = productsForChat[0];

    // ====== META PARA EL FRONT (CarCard) ======
    const meta = {
      type: "product-card" as const,
      product: car,
    };

    const metaBlock =
      "[[PRODUCT_CARD_META]]" + JSON.stringify(meta) + "[[/PRODUCT_CARD_META]]";

    // ====== TEXTO MARKDOWN (fallback / explicación) ======
    const fullName = `${car.brand} ${car.model} ${car.year}`;

    const priceNumber =
      typeof car.price === "number"
        ? car.price
        : parseFloat((car.price as unknown as string) ?? "0");

    const formattedPrice =
      priceNumber && !Number.isNaN(priceNumber)
        ? priceNumber.toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 2,
          })
        : "Precio no disponible";

    const formattedMileage =
      car.mileage && car.mileage > 0
        ? `${car.mileage.toLocaleString("es-ES")} km`
        : "No especificado";

    const intro = `Aquí tienes una opción de ${car.brand} de ${
      car.year
    } que podría interesarte:\n`;

    const lines: string[] = [];

    lines.push(intro);
    lines.push(`**${fullName}**\n`);

    lines.push(`- **Precio:** ${formattedPrice}`);
    lines.push(
      `- **Tipo de combustible:** ${car.fuelType ?? "No especificado"}`
    );
    lines.push(`- **Kilometraje:** ${formattedMileage}`);
    lines.push(`- **Categoría:** ${car.category ?? "No especificada"}`);
    if (car.seats) {
      lines.push(`- **Asientos:** ${car.seats}`);
    }
    if (car.doors) {
      lines.push(`- **Puertas:** ${car.doors}`);
    }
    if (car.color) {
      lines.push(`- **Color:** ${car.color}`);
    }
    if (car.description) {
      lines.push(`- **Descripción:** ${car.description}`);
    }

    if (car.productLink) {
      lines.push(`\n[Ver ficha del vehículo](${car.productLink})`);
    }

    if (car.mainImage) {
      lines.push(`\n![${fullName}](${car.mainImage})`);
    }

    const markdownBody = lines.join("\n");

    const fullResponse = `${metaBlock}\n\n${markdownBody}`;

    // Solo un chunk (no tiene sentido streamear a trozos aquí)
    yield fullResponse;
  }
}

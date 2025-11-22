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

type ChatAuthMode = "none" | "local" | "oauth2";

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly config: ConfigService,
    private readonly llm: LlmOrchestratorService,
    private readonly promptService: PromptService,
    private readonly pdfIngestion: PdfIngestionService,
    private readonly docxIngestion: DocxIngestionService,
    private readonly csvIngestion: CsvIngestionService
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

      const messages: LlmMessage[] = [
        { role: "system", content: baseSystemPrompt },
        { role: "user", content: params.message },
      ];

      for await (const delta of this.llm.streamChat({
        messages,
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

    const messages: LlmMessage[] = [
      {
        role: "system",
        content: enrichedPrompt,
      },
      {
        role: "user",
        content: params.message,
      },
    ];

    let fullAssistantText = "";

    for await (const delta of this.llm.streamChat({
      messages,
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
}

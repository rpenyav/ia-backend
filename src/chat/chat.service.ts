import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConversationsService } from "../conversations/conversations.service";
import {
  LlmMessage,
  LlmOrchestratorService,
} from "../llm/llm-orchestrator.service";
import { MessageRole } from "../conversations/message-role.enum";
import { ChatAttachmentDto } from "./dto/chat-attachment.dto";
import { PromptService } from "../prompts/prompt.service";

type ChatAuthMode = "none" | "local" | "oauth2";

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly config: ConfigService,
    private readonly llm: LlmOrchestratorService,
    private readonly promptService: PromptService
  ) {}

  async *streamMessage(params: {
    userId: string | null;
    conversationId?: string | null;
    message: string;
    attachments?: ChatAttachmentDto[];
  }): AsyncGenerator<string> {
    const chatAuthMode =
      (this.config.get<string>("CHAT_AUTH_MODE") as ChatAuthMode) || "none";

    // De momento, tenantId = APP_ID
    const tenantId = this.config.get<string>("APP_ID") ?? "global";
    const systemPrompt = await this.promptService.getSystemPrompt({
      tenantId,
    });

    // 1) MODO SIN AUTENTICACIÓN: no usamos conversaciones ni guardamos nada
    if (chatAuthMode === "none" || !params.userId) {
      // ⛔ No permitimos adjuntos en modo público
      if (params.attachments && params.attachments.length > 0) {
        throw new BadRequestException(
          "Adjuntos no permitidos cuando el chat no requiere autenticación"
        );
      }

      const messages: LlmMessage[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: params.message,
        },
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

    // 2) MODO CON AUTENTICACIÓN (local / oauth2): conversación + persistencia
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
          {
            title: "Nueva conversación",
            channel: "widget-web",
          }
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
        {
          title: "Nueva conversación",
          channel: "widget-web",
        }
      );
      const id = (conv as any).id ?? (conv as any)._id?.toString();
      conversationIdToUse = id;
    }

    // 3) Guardamos el mensaje del usuario (con adjuntos, si los hay)
    await this.conversationsService.addMessage({
      conversationId: conversationIdToUse,
      role: MessageRole.USER,
      content: params.message,
      attachments: params.attachments ?? [],
    });

    // 4) Construimos el prompt para el LLM usando el systemPrompt resuelto
    const messages: LlmMessage[] = [
      {
        role: "system",
        content: systemPrompt,
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
    })) {
      fullAssistantText += delta;
      yield delta;
    }

    // 5) Guardamos la respuesta completa del asistente (sin adjuntos por ahora)
    await this.conversationsService.addMessage({
      conversationId: conversationIdToUse,
      role: MessageRole.ASSISTANT,
      content: fullAssistantText,
      attachments: [],
    });
  }
}

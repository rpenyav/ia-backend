// src/chat/chat.controller.ts
import { Controller, Post, Body, UseGuards, Req, Res } from "@nestjs/common";
import { Response } from "express";
import { ChatAuthGuard } from "./guards/chat-auth.guard";
import { ChatService } from "./chat.service";
import { SendMessageDto } from "./dto/send-message.dto";

@Controller("chat")
@UseGuards(ChatAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("message")
  async streamMessage(
    @Req() req,
    @Body() dto: SendMessageDto,
    @Res() res: Response
  ) {
    const user = req.user || null;

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    (res as any).flushHeaders?.();

    try {
      const stream = this.chatService.streamMessage({
        userId: user?.userId ?? null,
        conversationId: dto.conversationId ?? null, // 👈 ahora cuadra con el tipo
        message: dto.message,
        attachments: dto.attachments ?? [], // 👈 pasamos adjuntos
      });

      for await (const delta of stream) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err: any) {
      const status = err?.response?.status;
      const providerError = err?.response?.data;

      let friendlyMessage = err?.message ?? "Error generating response";

      if (status === 402) {
        friendlyMessage =
          "El proveedor de IA no tiene saldo suficiente (HTTP 402). Revisa la cuenta o cambia de modelo/proveedor.";
      }

      if (status === 429) {
        friendlyMessage =
          "El proveedor de IA está devolviendo demasiadas peticiones (HTTP 429). Inténtalo más tarde o cambia de modelo/proveedor.";
      }

      res.write(
        `data: ${JSON.stringify({
          error: true,
          status,
          message: friendlyMessage,
          providerError,
        })}\n\n`
      );
    } finally {
      res.end();
    }
  }
}

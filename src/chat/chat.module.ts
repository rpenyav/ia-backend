// src/chat/chat.module.ts
import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ConversationsModule } from "../conversations/conversations.module";
import { LlmModule } from "../llm/llm.module";
import { PromptService } from "../prompts/prompt.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [
    ConversationsModule,
    LlmModule,
    SettingsModule.register(), // 👈 aquí traemos SettingsService al contexto
  ],
  controllers: [ChatController],
  providers: [ChatService, PromptService],
  exports: [ChatService],
})
export class ChatModule {}

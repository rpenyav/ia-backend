// src/chat/chat.module.ts
import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ConversationsModule } from "../conversations/conversations.module";
import { LlmModule } from "../llm/llm.module";
import { PromptService } from "../prompts/prompt.service";
import { SettingsModule } from "../settings/settings.module";

import { PdfIngestionService } from "../doc-ingestion/pdf-ingestion.service";
import { DocxIngestionService } from "../doc-ingestion/docx-ingestion.service";
import { CsvIngestionService } from "../doc-ingestion/csv-ingestion.service";

@Module({
  imports: [
    ConversationsModule,
    LlmModule,
    SettingsModule.register(), // SettingsService para PromptService
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    PromptService,
    PdfIngestionService,
    DocxIngestionService,
    CsvIngestionService,
  ],
  exports: [ChatService],
})
export class ChatModule {}

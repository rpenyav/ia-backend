// src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { LlmModule } from "./llm/llm.module";

import { UsageModule } from "./usage/usage.module";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { SettingsModule } from "./settings/settings.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule.forRoot(),
    LlmModule,
    AuthModule,
    SettingsModule.register(),
    ChatModule,
    UsageModule,
    ConversationsModule,
    StorageModule,
  ],
})
export class AppModule {}

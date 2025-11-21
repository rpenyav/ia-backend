// src/llm/llm.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LlmOrchestratorService } from "./llm-orchestrator.service";
import { UsageModule } from "../usage/usage.module";

@Module({
  imports: [
    ConfigModule,
    UsageModule, // 👈 aquí traemos UsageService al contexto del LlmModule
  ],
  providers: [LlmOrchestratorService],
  exports: [LlmOrchestratorService],
})
export class LlmModule {}

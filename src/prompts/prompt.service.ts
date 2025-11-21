// src/prompts/prompt.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SettingsService } from "../settings/settings.service";
import { DEFAULT_SYSTEM_PROMPT } from "./default-system.prompt";

@Injectable()
export class PromptService {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService
  ) {}

  /**
   * Obtiene el system prompt aplicable.
   * - Primero mira settings (prompt.system) con scope/tenant.
   * - Si no hay nada, devuelve DEFAULT_SYSTEM_PROMPT.
   */
  async getSystemPrompt(options?: {
    tenantId?: string | null;
  }): Promise<string> {
    const tenantId =
      options?.tenantId ?? this.config.get<string>("APP_ID") ?? "global";

    // 1) Primero intentamos prompt específico del tenant
    const tenantPrompt = await this.settingsService.getValue<string>(
      "prompt.system",
      tenantId
    );

    if (tenantPrompt && tenantPrompt.trim().length > 0) {
      return tenantPrompt;
    }

    // 2) Después probamos un prompt global
    const globalPrompt = await this.settingsService.getValue<string>(
      "prompt.system",
      "global"
    );

    if (globalPrompt && globalPrompt.trim().length > 0) {
      return globalPrompt;
    }

    // 3) Fallback al prompt por defecto en archivo
    return DEFAULT_SYSTEM_PROMPT;
  }
}

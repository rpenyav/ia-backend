import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import axios from "axios";
import { UsageService } from "../usage/usage.service";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LlmProvider = "openai" | "gemini" | "deepseek" | "grok";

@Injectable()
export class LlmOrchestratorService {
  private openai: OpenAI | null;
  private deepseek: OpenAI | null;
  private grok: OpenAI | null; // usamos el SDK OpenAI contra la API de xAI

  constructor(
    private readonly config: ConfigService,
    private readonly usageService: UsageService
  ) {
    // ----- OpenAI -----
    const openaiApiKey = this.config.get<string>("OPENAI_API_KEY");
    const openaiBaseURL = this.config.get<string>("OPENAI_BASE_URL");

    this.openai = openaiApiKey
      ? new OpenAI({
          apiKey: openaiApiKey,
          baseURL: openaiBaseURL,
        })
      : null;

    // ----- DeepSeek (OpenAI compatible) -----
    const deepseekApiKey = this.config.get<string>("DEEPSEEK_API_KEY");
    const deepseekBaseURL =
      this.config.get<string>("DEEPSEEK_BASE_URL") ||
      "https://api.deepseek.com/v1";

    this.deepseek = deepseekApiKey
      ? new OpenAI({
          apiKey: deepseekApiKey,
          baseURL: deepseekBaseURL,
        })
      : null;

    // ----- Grok / xAI (OpenAI compatible) -----
    const grokApiKey = this.config.get<string>("GROK_API_KEY");
    const grokBaseURL =
      this.config.get<string>("GROK_BASE_URL") || "https://api.x.ai/v1";

    this.grok = grokApiKey
      ? new OpenAI({
          apiKey: grokApiKey,
          baseURL: grokBaseURL,
        })
      : null;
  }

  private getProvider(): LlmProvider {
    const p =
      (this.config.get<string>("DEFAULT_LLM_PROVIDER") as LlmProvider) ||
      "openai";
    return p;
  }

  /**
   * Punto de entrada único: delega según DEFAULT_LLM_PROVIDER
   * y registra uso al final.
   */
  async *streamChat(params: {
    model?: string;
    messages: LlmMessage[];
    temperature?: number;
    maxTokens?: number;
    userId?: string | null;
    conversationId?: string | null;
  }): AsyncGenerator<string> {
    const provider = this.getProvider();

    // Resolución de modelo + temperatura + maxTokens en un solo sitio
    let model: string;
    let temperature: number;
    let maxTokens: number;

    const defaultTemp =
      this.config.get<number>("DEFAULT_LLM_TEMPERATURE") ?? 0.2;
    const defaultMaxTokens =
      this.config.get<number>("DEFAULT_LLM_MAX_TOKENS") ?? 2048;

    switch (provider) {
      case "deepseek":
        model =
          params.model ||
          this.config.get<string>("DEFAULT_LLM_MODEL") ||
          "deepseek-chat";
        temperature = params.temperature ?? defaultTemp;
        maxTokens = params.maxTokens ?? defaultMaxTokens;
        break;

      case "grok":
        model =
          params.model ||
          this.config.get<string>("DEFAULT_LLM_MODEL") ||
          "grok-4-latest";
        // por defecto para grok lo teníamos a 0.0
        temperature = params.temperature ?? 0.0;
        maxTokens = params.maxTokens ?? defaultMaxTokens;
        break;

      case "gemini":
        model =
          params.model ||
          this.config.get<string>("DEFAULT_LLM_MODEL") ||
          "gemini-3-pro-preview";
        temperature = params.temperature ?? defaultTemp;
        maxTokens = params.maxTokens ?? defaultMaxTokens;
        break;

      case "openai":
      default:
        model =
          params.model ||
          this.config.get<string>("DEFAULT_LLM_MODEL") ||
          "gpt-4.1-mini";
        temperature = params.temperature ?? defaultTemp;
        maxTokens = params.maxTokens ?? defaultMaxTokens;
        break;
    }

    let fullText = "";

    // Delegamos en el provider, pero ya con modelo/temps resueltos
    switch (provider) {
      case "gemini":
        for await (const delta of this.streamChatGemini({
          model,
          messages: params.messages,
          temperature,
          maxTokens,
        })) {
          fullText += delta;
          yield delta;
        }
        break;

      case "deepseek":
        for await (const delta of this.streamChatDeepSeek({
          model,
          messages: params.messages,
          temperature,
          maxTokens,
        })) {
          fullText += delta;
          yield delta;
        }
        break;

      case "grok":
        for await (const delta of this.streamChatGrok({
          model,
          messages: params.messages,
          temperature,
          maxTokens,
        })) {
          fullText += delta;
          yield delta;
        }
        break;

      case "openai":
      default:
        for await (const delta of this.streamChatOpenAI({
          model,
          messages: params.messages,
          temperature,
          maxTokens,
        })) {
          fullText += delta;
          yield delta;
        }
        break;
    }

    // ===== Estimación sencilla de tokens por longitud de texto =====
    const inputChars = params.messages
      .map((m) => m.content.length)
      .reduce((acc, len) => acc + len, 0);

    const outputChars = fullText.length;

    const estimateTokens = (chars: number): number => {
      if (chars <= 0) return 0;
      return Math.max(1, Math.round(chars / 4)); // aprox: 4 chars ~ 1 token
    };

    const inputTokens = estimateTokens(inputChars);
    const outputTokens = estimateTokens(outputChars);
    const totalTokens = inputTokens + outputTokens;

    // Registro de uso con estimación
    await this.usageService.logUsage({
      provider,
      model,
      userId: params.userId ?? null,
      conversationId: params.conversationId ?? null,
      inputTokens,
      outputTokens,
      totalTokens,
    });
  }

  // =========================================================
  // OPENAI
  // =========================================================

  private async *streamChatOpenAI(params: {
    model: string;
    messages: LlmMessage[];
    temperature: number;
    maxTokens: number;
  }): AsyncGenerator<string> {
    if (!this.openai) {
      throw new Error("OPENAI_API_KEY no está configurado");
    }

    const stream = await this.openai.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  // =========================================================
  // DEEPSEEK
  // =========================================================

  private async *streamChatDeepSeek(params: {
    model: string;
    messages: LlmMessage[];
    temperature: number;
    maxTokens: number;
  }): AsyncGenerator<string> {
    if (!this.deepseek) {
      throw new Error("DEEPSEEK_API_KEY no está configurado");
    }

    const stream = await this.deepseek.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  // =========================================================
  // GROK / xAI
  // =========================================================

  private async *streamChatGrok(params: {
    model: string;
    messages: LlmMessage[];
    temperature: number;
    maxTokens: number;
  }): AsyncGenerator<string> {
    if (!this.grok) {
      throw new Error("GROK_API_KEY no está configurado");
    }

    const stream = await this.grok.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  // =========================================================
  // GEMINI
  // =========================================================

  private async *streamChatGemini(params: {
    model: string;
    messages: LlmMessage[];
    temperature: number;
    maxTokens: number;
  }): AsyncGenerator<string> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    const baseURL =
      this.config.get<string>("GEMINI_BASE_URL") ||
      "https://generativelanguage.googleapis.com/v1beta";

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurado");
    }

    const systemText = params.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const nonSystem = params.messages.filter((m) => m.role !== "system");

    const contents = nonSystem.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body: any = {
      contents,
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
      },
    };

    if (systemText) {
      body.systemInstruction = {
        role: "user",
        parts: [{ text: systemText }],
      };
    }

    const url = `${baseURL}/models/${params.model}:streamGenerateContent`;

    const response = await axios.post(url, body, {
      responseType: "stream",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    const stream = response.data as NodeJS.ReadableStream;

    let buffer = "";

    for await (const chunk of stream) {
      buffer += chunk.toString();

      let index: number;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);

        if (!line) continue;

        let jsonStr = line;
        if (jsonStr.startsWith("data:")) {
          jsonStr = jsonStr.slice("data:".length).trim();
        }

        try {
          const json = JSON.parse(jsonStr);
          const candidates = json.candidates ?? [];

          for (const cand of candidates) {
            const parts = cand.content?.parts ?? [];
            for (const part of parts) {
              const text = part.text;
              if (text) {
                yield text;
              }
            }
          }
        } catch {
          // ignoramos líneas no JSON
        }
      }
    }
  }
}

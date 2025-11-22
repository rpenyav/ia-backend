// src/llm/llm-orchestrator.service.ts
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
  private grok: OpenAI | null; // usamos el SDK OpenAI contra la API de xAI / DeepSeek

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

  private estimateTokensFromText(text: string): number {
    if (!text) return 0;
    // regla de dedo: ~4 caracteres por token
    return Math.ceil(text.length / 4);
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
    imageUrls?: string[]; // 👈 NUEVO (opcional) para visión OpenAI
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
          "gpt-4o-mini";
        temperature = params.temperature ?? defaultTemp;
        maxTokens = params.maxTokens ?? defaultMaxTokens;
        break;
    }

    let fullText = "";
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;

    switch (provider) {
      case "gemini": {
        for await (const delta of this.streamChatGemini({
          model,
          messages: params.messages,
          temperature,
          maxTokens,
        })) {
          fullText += delta;
          yield delta;
        }

        // estimación de tokens para gemini
        const inputText = params.messages.map((m) => m.content).join("\n");
        inputTokens = this.estimateTokensFromText(inputText);
        outputTokens = this.estimateTokensFromText(fullText);
        break;
      }

      case "deepseek": {
        for await (const delta of this.streamChatDeepSeek({
          model,
          messages: params.messages,
          temperature,
          maxTokens,
        })) {
          fullText += delta;
          yield delta;
        }

        const inputText = params.messages.map((m) => m.content).join("\n");
        inputTokens = this.estimateTokensFromText(inputText);
        outputTokens = this.estimateTokensFromText(fullText);
        break;
      }

      case "grok": {
        for await (const delta of this.streamChatGrok({
          model,
          messages: params.messages,
          temperature,
          maxTokens,
        })) {
          fullText += delta;
          yield delta;
        }

        const inputText = params.messages.map((m) => m.content).join("\n");
        inputTokens = this.estimateTokensFromText(inputText);
        outputTokens = this.estimateTokensFromText(fullText);
        break;
      }

      case "openai":
      default: {
        // para OpenAI usamos usage real a través del stream
        const usageRef = {
          inputTokens: null as number | null,
          outputTokens: null as number | null,
        };

        for await (const delta of this.streamChatOpenAI({
          model,
          messages: params.messages,
          temperature,
          maxTokens,
          imageUrls: params.imageUrls,
          usageRef,
        })) {
          fullText += delta;
          yield delta;
        }

        inputTokens = usageRef.inputTokens;
        outputTokens = usageRef.outputTokens;

        // si por lo que sea no trajera usage, caemos a estimación
        if (inputTokens == null) {
          const inputText = params.messages.map((m) => m.content).join("\n");
          inputTokens = this.estimateTokensFromText(inputText);
        }
        if (outputTokens == null) {
          outputTokens = this.estimateTokensFromText(fullText);
        }

        break;
      }
    }

    await this.usageService.logUsage({
      provider,
      model,
      userId: params.userId ?? null,
      conversationId: params.conversationId ?? null,
      inputTokens,
      outputTokens,
      totalTokens: null, // se calcula en UsageService si es null
    });
  }

  // =========================================================
  // OPENAI con visión (image_url)
  // =========================================================

  private async *streamChatOpenAI(params: {
    model: string;
    messages: LlmMessage[];
    temperature: number;
    maxTokens: number;
    imageUrls?: string[];
    usageRef: { inputTokens: number | null; outputTokens: number | null };
  }): AsyncGenerator<string> {
    if (!this.openai) {
      throw new Error("OPENAI_API_KEY no está configurado");
    }

    const { model, messages, temperature, maxTokens, imageUrls, usageRef } =
      params;

    const hasImages = imageUrls && imageUrls.length > 0;

    let openaiMessages: any[] = messages;

    if (hasImages) {
      // añadimos las image_url al ÚLTIMO mensaje de usuario
      let lastUserIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          lastUserIndex = i;
          break;
        }
      }

      if (lastUserIndex >= 0) {
        openaiMessages = messages.map((m, idx) => {
          if (idx !== lastUserIndex || m.role !== "user") {
            return m;
          }

          const contentParts: any[] = [
            { type: "text", text: m.content },
            ...(imageUrls || []).map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          ];

          return {
            role: "user",
            content: contentParts,
          };
        });
      }
    }

    const stream = await this.openai.chat.completions.create({
      model,
      messages: openaiMessages as any, // mezclamos string & parts (para visión)
      temperature,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const deltaContent: any = chunk.choices[0]?.delta?.content;

      // modo texto normal (string)
      if (typeof deltaContent === "string") {
        if (deltaContent) {
          yield deltaContent;
        }
      }
      // modo multimodal: array de partes [{type:"text", text:"..."}, ...]
      else if (Array.isArray(deltaContent)) {
        for (const part of deltaContent) {
          if (part.type === "text" && part.text) {
            yield part.text;
          }
        }
      }

      const usage = (chunk as any).usage;
      if (usage) {
        usageRef.inputTokens =
          usage.prompt_tokens ?? usageRef.inputTokens ?? null;
        usageRef.outputTokens =
          usage.completion_tokens ?? usageRef.outputTokens ?? null;
      }
    }
  }

  // =========================================================
  // DEEPSEEK (formato OpenAI /chat/completions)
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
  // GROK / xAI (formato OpenAI /chat/completions)
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
  // GEMINI (REST, streamGenerateContent)
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

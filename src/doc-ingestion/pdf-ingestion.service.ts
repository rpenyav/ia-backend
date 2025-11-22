// src/doc-ingestion/pdf-ingestion.service.ts
import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

// 👇 Usamos pdf-parse-fork (CJS, exporta directamente una función)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse-fork") as (
  buffer: Buffer
) => Promise<{ text: string }>;

@Injectable()
export class PdfIngestionService {
  private readonly logger = new Logger(PdfIngestionService.name);

  async extractTextFromPdfUrl(
    url: string,
    options?: { maxChars?: number }
  ): Promise<string | null> {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: "arraybuffer",
      });

      const buffer = Buffer.from(response.data);

      const parsed = await pdfParse(buffer);

      let text: string = parsed.text || "";

      text = text
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (!text) {
        return null;
      }

      if (options?.maxChars && text.length > options.maxChars) {
        text =
          text.slice(0, options.maxChars) +
          "\n\n[...contenido truncado para no exceder el límite de tokens...]";
      }

      return text;
    } catch (err: any) {
      this.logger.error(
        `Error extrayendo texto de PDF (${url}): ${err.message}`,
        err.stack
      );
      return null;
    }
  }
}

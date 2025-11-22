// src/doc-ingestion/docx-ingestion.service.ts
import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import * as mammoth from "mammoth";

@Injectable()
export class DocxIngestionService {
  private readonly logger = new Logger(DocxIngestionService.name);

  /**
   * Descarga un DOCX desde una URL y devuelve el texto plano.
   */
  async extractTextFromDocxUrl(
    url: string,
    options?: { maxChars?: number }
  ): Promise<string | null> {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: "arraybuffer",
      });

      const buffer = Buffer.from(response.data);

      const { value } = await mammoth.extractRawText({ buffer });

      let text = (value || "")
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (!text) {
        return null;
      }

      if (options?.maxChars && text.length > options.maxChars) {
        text =
          text.slice(0, options.maxChars) +
          "\n\n[...contenido DOCX truncado para no exceder el límite de tokens...]";
      }

      return text;
    } catch (err: any) {
      this.logger.error(
        `Error extrayendo texto de DOCX (${url}): ${err.message}`,
        err.stack
      );
      return null;
    }
  }
}

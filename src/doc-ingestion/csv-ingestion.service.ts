// src/doc-ingestion/csv-ingestion.service.ts
import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class CsvIngestionService {
  private readonly logger = new Logger(CsvIngestionService.name);

  /**
   * Descarga un CSV desde una URL y devuelve texto (por ejemplo primeras N líneas).
   */
  async extractTextFromCsvUrl(
    url: string,
    options?: { maxChars?: number; maxLines?: number }
  ): Promise<string | null> {
    try {
      const response = await axios.get<string>(url, {
        responseType: "text",
      });

      let text = response.data || "";

      // Opcional: limitar líneas
      if (options?.maxLines) {
        const lines = text.split(/\r?\n/);
        const limited = lines.slice(0, options.maxLines);
        text = limited.join("\n");
      }

      text = text.trim();
      if (!text) return null;

      const maxChars = options?.maxChars ?? 6000;
      if (text.length > maxChars) {
        text =
          text.slice(0, maxChars) +
          "\n\n[...contenido CSV truncado para no exceder el límite de tokens...]";
      }

      return text;
    } catch (err: any) {
      this.logger.error(
        `Error extrayendo texto de CSV (${url}): ${err.message}`,
        err.stack
      );
      return null;
    }
  }
}

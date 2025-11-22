// src/storage/storage.service.ts
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";
import { Express } from "express";

export interface UploadResult {
  url: string;
  provider: string;
  key?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
}

@Injectable()
export class StorageService {
  private readonly provider: string;

  // Tipos de fichero permitidos (no imágenes)
  private readonly allowedMimeTypes: string[] = [
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
    "application/vnd.rar",
    "application/x-rar-compressed",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel", // .xls (a veces también csv)
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "text/csv",
  ];

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>("STORAGE_PROVIDER") || "cloudinary";

    if (this.provider === "cloudinary") {
      cloudinary.config({
        cloud_name: this.config.get<string>("CLOUDINARY_CLOUD_NAME"),
        api_key: this.config.get<string>("CLOUDINARY_API_KEY"),
        api_secret: this.config.get<string>("CLOUDINARY_API_SECRET"),
      });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException("No se ha recibido ningún archivo");
    }

    // 1) Validar tipo de archivo
    const mime = file.mimetype;

    const isImage = mime.startsWith("image/");
    const isAllowedNonImage =
      this.allowedMimeTypes.includes(mime) ||
      // fallback por extensión para casos raros
      this.isAllowedByExtension(file.originalname);

    if (!isImage && !isAllowedNonImage) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${mime} (${file.originalname})`
      );
    }

    if (this.provider === "cloudinary") {
      return this.uploadToCloudinary(file, isImage);
    }

    if (this.provider === "s3") {
      throw new InternalServerErrorException(
        "S3 provider no implementado todavía"
      );
    }

    if (this.provider === "local") {
      throw new InternalServerErrorException(
        "Storage local no implementado todavía"
      );
    }

    throw new InternalServerErrorException("Proveedor de storage no soportado");
  }

  private isAllowedByExtension(filename: string): boolean {
    const lower = filename.toLowerCase();

    const allowedExts = [
      ".pdf",
      ".zip",
      ".rar",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".csv",
    ];

    return allowedExts.some((ext) => lower.endsWith(ext));
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    isImage: boolean
  ): Promise<UploadResult> {
    try {
      // Imágenes → resource_type: "image"
      // PDFs, ZIP, DOCX, etc. → resource_type: "raw"
      const resourceType = isImage ? "image" : "raw";

      const uploaded: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: "chat-attachments",
          },
          (error, result) => {
            if (error || !result) {
              return reject(error);
            }
            resolve(result);
          }
        );

        stream.end(file.buffer);
      });

      return {
        url: uploaded.secure_url,
        provider: "cloudinary",
        key: uploaded.public_id,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        "Error subiendo archivo a Cloudinary"
      );
    }
  }
}

// src/storage/storage.service.ts
import { Injectable, InternalServerErrorException } from "@nestjs/common";
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

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>("STORAGE_PROVIDER") || "cloudinary";

    if (this.provider === "cloudinary") {
      cloudinary.config({
        cloud_name: this.config.get<string>("CLOUDINARY_CLOUD_NAME"),
        api_key: this.config.get<string>("CLOUDINARY_API_KEY"),
        api_secret: this.config.get<string>("CLOUDINARY_API_SECRET"),
      });
    }

    // S3 / MinIO se configurará más adelante
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    if (this.provider === "cloudinary") {
      return this.uploadToCloudinary(file);
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

  private async uploadToCloudinary(
    file: Express.Multer.File
  ): Promise<UploadResult> {
    try {
      // Envolvemos upload_stream en una Promesa
      const uploaded: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            folder: "chat-attachments",
          },
          (error, result) => {
            if (error || !result) {
              return reject(error);
            }
            resolve(result);
          }
        );

        // Enviamos el buffer del archivo al stream
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

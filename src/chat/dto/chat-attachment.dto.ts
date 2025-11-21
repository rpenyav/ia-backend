// src/chat/dto/chat-attachment.dto.ts
import {
  IsIn,
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
} from "class-validator";

export class ChatAttachmentDto {
  @IsOptional()
  @IsIn(["file", "image", "link", "other"])
  type?: "file" | "image" | "link" | "other";

  @IsString()
  url: string;

  // 👇 nuevo: permitimos la key (por ejemplo Cloudinary public_id)
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  sizeBytes?: number;

  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;
}

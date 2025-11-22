// src/chat/dto/chat-attachment.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum, IsUrl } from "class-validator";

export enum ChatAttachmentType {
  FILE = "file",
  IMAGE = "image",
  LINK = "link",
  OTHER = "other",
}

export class ChatAttachmentDto {
  @IsOptional() // si quieres que sea obligatorio, quita @IsOptional()
  @IsEnum(ChatAttachmentType)
  type?: ChatAttachmentType;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  sizeBytes?: number;

  // 👇 campos que te está devolviendo el upload
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  extra?: Record<string, any>;
}

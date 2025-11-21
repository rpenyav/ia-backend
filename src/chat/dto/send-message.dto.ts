// src/chat/dto/send-message.dto.ts
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ChatAttachmentDto } from "./chat-attachment.dto";

export class SendMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string | null;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}

// src/conversations/dto/create-conversation.dto.ts
import { IsOptional, IsString } from "class-validator";

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}

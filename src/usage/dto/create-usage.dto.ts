// src/usage/dto/create-usage.dto.ts
import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateUsageDto {
  @IsString()
  provider: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  conversationId?: string | null;

  @IsOptional()
  @IsNumber()
  inputTokens?: number | null;

  @IsOptional()
  @IsNumber()
  outputTokens?: number | null;

  @IsOptional()
  @IsNumber()
  totalTokens?: number | null;
}

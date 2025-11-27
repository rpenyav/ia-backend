// src/env-config/dto/create-env-var.dto.ts
export class CreateEnvVarDto {
  key: string;
  value: string;
  description?: string;
  isSecret?: boolean;
}

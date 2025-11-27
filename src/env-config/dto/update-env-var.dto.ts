// src/env-config/dto/update-env-var.dto.ts
export class UpdateEnvVarDto {
  value?: string;
  description?: string;
  isSecret?: boolean;
}

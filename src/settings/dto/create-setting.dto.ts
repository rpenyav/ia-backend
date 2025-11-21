// src/settings/dto/create-setting.dto.ts
export class CreateSettingDto {
  key: string;
  scope?: string | null;
  value: any;
}

export class ChatAttachmentDto {
  type: "file" | "image" | "link" | "other";
  url: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  extra?: Record<string, any>;
}

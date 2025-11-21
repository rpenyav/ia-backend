import { ChatAttachmentDto } from "./chat-attachment.dto";

export class SendMessageDto {
  conversationId?: string | null;
  message: string;
  attachments?: ChatAttachmentDto[];
}

// src/conversations/schema/message.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { MessageRole } from "../message-role.enum";

@Schema({
  collection: "messages", // 👈 nombre de colección
  timestamps: { createdAt: true, updatedAt: true },
})
export class MessageMongo {
  @Prop({ required: true })
  conversationId: string; // string/uuid de la conversación

  @Prop({ required: true, enum: ["user", "assistant", "system"] })
  role: MessageRole;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export type MessageMongoDocument = MessageMongo & Document;
export const MessageMongoSchema = SchemaFactory.createForClass(MessageMongo);

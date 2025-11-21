// src/conversations/schema/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({
  collection: "conversations", // 👈 nombre de colección
  timestamps: true,
})
export class ConversationMongo {
  @Prop({ required: true })
  userId: string; // string/uuid del usuario

  @Prop()
  title?: string;

  @Prop()
  channel?: string; // ej: widget-web, backoffice

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export type ConversationMongoDocument = ConversationMongo & Document;
export const ConversationMongoSchema =
  SchemaFactory.createForClass(ConversationMongo);

// src/usage/schema/usage.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({
  collection: "usage",
  timestamps: { createdAt: true, updatedAt: false },
})
export class UsageMongo {
  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: true })
  model: string;

  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String, required: false })
  conversationId?: string;

  @Prop({ type: Number, required: false })
  inputTokens?: number;

  @Prop({ type: Number, required: false })
  outputTokens?: number;

  @Prop({ type: Number, required: true })
  totalTokens: number;
}

export type UsageMongoDocument = UsageMongo & Document;
export const UsageMongoSchema = SchemaFactory.createForClass(UsageMongo);

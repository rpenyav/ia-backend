// src/settings/schema/setting.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({
  collection: "settings",
  timestamps: { createdAt: true, updatedAt: true },
})
export class SettingMongo {
  @Prop({ type: String, required: true })
  key: string;

  // 👇 Nada de string | null, y explicitamos el type
  @Prop({ type: String, required: false })
  scope?: string; // "global" o id de tenant/cliente

  @Prop({ type: Object, required: false })
  value?: any;
}

export type SettingMongoDocument = SettingMongo & Document;
export const SettingMongoSchema = SchemaFactory.createForClass(SettingMongo);

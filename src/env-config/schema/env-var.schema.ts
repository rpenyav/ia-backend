// src/env-config/schema/env-var.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({
  collection: "env_vars",
  timestamps: true,
})
export class EnvVarMongo {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  value: string;

  @Prop()
  description?: string;

  @Prop({ default: false })
  isSecret: boolean;
}

export type EnvVarMongoDocument = EnvVarMongo & Document;
export const EnvVarMongoSchema = SchemaFactory.createForClass(EnvVarMongo);

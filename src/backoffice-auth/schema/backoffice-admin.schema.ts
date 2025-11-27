// src/backoffice-auth/schema/backoffice-admin.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({
  collection: "backoffice_admins",
  timestamps: true,
})
export class BackofficeAdminMongo {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;
}

export type BackofficeAdminMongoDocument = BackofficeAdminMongo & Document;
export const BackofficeAdminMongoSchema =
  SchemaFactory.createForClass(BackofficeAdminMongo);

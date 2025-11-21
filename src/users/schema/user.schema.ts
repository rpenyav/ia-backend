// src/users/schema/user.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({
  collection: "users",
  timestamps: true,
})
export class UserMongo {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop()
  name?: string;
}

export type UserMongoDocument = UserMongo & Document;
export const UserMongoSchema = SchemaFactory.createForClass(UserMongo);

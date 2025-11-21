// src/conversations/conversations.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { ConversationsService } from "./conversations.service";
import { ConversationsController } from "./conversations.controller";
import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import {
  ConversationMongo,
  ConversationMongoSchema,
} from "./schema/conversation.schema";
import { MessageMongo, MessageMongoSchema } from "./schema/message.schema";

const isMongo = process.env.DB_DRIVER === "mongodb";

const typeOrmImports = isMongo
  ? []
  : [TypeOrmModule.forFeature([Conversation, Message])];

const mongooseImports = isMongo
  ? [
      MongooseModule.forFeature([
        { name: ConversationMongo.name, schema: ConversationMongoSchema },
        { name: MessageMongo.name, schema: MessageMongoSchema },
      ]),
    ]
  : [];

@Module({
  imports: [...typeOrmImports, ...mongooseImports],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}

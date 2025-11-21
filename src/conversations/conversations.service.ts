// src/conversations/conversations.service.ts
import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";

import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import { MessageRole } from "./message-role.enum";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import {
  ConversationMongo,
  ConversationMongoDocument,
} from "./schema/conversation.schema";
import { MessageMongo, MessageMongoDocument } from "./schema/message.schema";

@Injectable()
export class ConversationsService {
  private readonly useMongo: boolean;

  constructor(
    private readonly config: ConfigService,

    // SQL (pueden ser null si DB_DRIVER = mongodb)
    @InjectRepository(Conversation)
    @Optional()
    private readonly convRepo: Repository<Conversation> | null,

    @InjectRepository(Message)
    @Optional()
    private readonly msgRepo: Repository<Message> | null,

    // Mongo (pueden ser null si DB_DRIVER != mongodb)
    @InjectModel(ConversationMongo.name)
    @Optional()
    private readonly convModel: Model<ConversationMongoDocument> | null,

    @InjectModel(MessageMongo.name)
    @Optional()
    private readonly msgModel: Model<MessageMongoDocument> | null
  ) {
    this.useMongo = this.config.get<string>("DB_DRIVER") === "mongodb";
  }

  // ---------- CRUD básico ----------

  async create(dto: CreateConversationDto, userId: string): Promise<any> {
    if (this.useMongo) {
      if (!this.convModel) {
        throw new Error(
          "ConversationMongoModel no disponible (DB_DRIVER no mongodb)"
        );
      }
      const doc = new this.convModel({
        userId,
        title: dto.title,
        channel: dto.channel,
      });
      return doc.save();
    } else {
      if (!this.convRepo) {
        throw new Error(
          "ConversationRepository no está disponible (DB_DRIVER no SQL)"
        );
      }

      const conv = this.convRepo.create({
        user: { id: userId } as any,
        title: dto.title,
        channel: dto.channel,
      });
      return this.convRepo.save(conv);
    }
  }

  async findAllForUser(userId: string): Promise<any[]> {
    if (this.useMongo) {
      if (!this.convModel) {
        throw new Error(
          "ConversationMongoModel no disponible (DB_DRIVER no mongodb)"
        );
      }
      return this.convModel.find({ userId }).sort({ createdAt: -1 }).exec();
    } else {
      if (!this.convRepo) {
        throw new Error(
          "ConversationRepository no está disponible (DB_DRIVER no SQL)"
        );
      }

      return this.convRepo.find({
        where: { user: { id: userId } as any },
        order: { createdAt: "DESC" },
      });
    }
  }

  async findOneForUser(id: string, userId: string): Promise<any | null> {
    if (this.useMongo) {
      if (!this.convModel || !this.msgModel) {
        throw new Error("Modelos Mongo no disponibles (DB_DRIVER no mongodb)");
      }

      const conv = await this.convModel
        .findOne({ _id: new Types.ObjectId(id), userId })
        .lean();
      if (!conv) return null;

      const messages = await this.msgModel
        .find({ conversationId: conv._id.toString() })
        .sort({ createdAt: 1 })
        .lean();

      return {
        ...conv,
        id: conv._id.toString(),
        messages,
      };
    } else {
      if (!this.convRepo) {
        throw new Error(
          "ConversationRepository no está disponible (DB_DRIVER no SQL)"
        );
      }

      return this.convRepo.findOne({
        where: { id, user: { id: userId } as any },
        relations: ["messages"],
      });
    }
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateConversationDto
  ): Promise<any | null> {
    if (this.useMongo) {
      if (!this.convModel) {
        throw new Error(
          "ConversationMongoModel no disponible (DB_DRIVER no mongodb)"
        );
      }

      const update: any = {};
      if (dto.title !== undefined) update.title = dto.title;
      if (dto.channel !== undefined) update.channel = dto.channel;

      return this.convModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(id), userId },
          { $set: update },
          { new: true }
        )
        .exec();
    } else {
      if (!this.convRepo) {
        throw new Error(
          "ConversationRepository no está disponible (DB_DRIVER no SQL)"
        );
      }

      const conv = await this.convRepo.findOne({
        where: { id, user: { id: userId } as any },
      });
      if (!conv) return null;

      if (dto.title !== undefined) conv.title = dto.title;
      if (dto.channel !== undefined) conv.channel = dto.channel;

      return this.convRepo.save(conv);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    if (this.useMongo) {
      if (!this.convModel || !this.msgModel) {
        throw new Error("Modelos Mongo no disponibles (DB_DRIVER no mongodb)");
      }

      const conv = await this.convModel
        .findOneAndDelete({ _id: new Types.ObjectId(id), userId })
        .exec();
      if (conv) {
        await this.msgModel
          .deleteMany({ conversationId: conv._id.toString() })
          .exec();
      }
    } else {
      if (!this.convRepo || !this.msgRepo) {
        throw new Error(
          "Repositorios TypeORM no disponibles (DB_DRIVER no SQL)"
        );
      }

      const conv = await this.convRepo.findOne({
        where: { id, user: { id: userId } as any },
      });
      if (conv) {
        await this.msgRepo.delete({ conversation: { id } as any });
        await this.convRepo.delete({ id });
      }
    }
  }

  // ---------- Métodos usados por ChatService ----------

  async createConversationForUser(
    userId: string,
    params?: { title?: string; channel?: string }
  ): Promise<any> {
    return this.create(
      {
        title: params?.title,
        channel: params?.channel,
      } as any,
      userId
    );
  }

  async findConversationForUser(
    conversationId: string,
    userId: string
  ): Promise<any | null> {
    return this.findOneForUser(conversationId, userId);
  }

  async addMessage(params: {
    conversationId: string;
    role: MessageRole;
    content: string;
    attachments?: any[];
  }): Promise<any> {
    if (this.useMongo) {
      if (!this.convModel || !this.msgModel) {
        throw new Error("Modelos Mongo no disponibles (DB_DRIVER no mongodb)");
      }

      const conv = await this.convModel.findById(
        new Types.ObjectId(params.conversationId)
      );
      if (!conv) {
        throw new Error("Conversation not found");
      }

      const msg = new this.msgModel({
        conversationId: conv._id.toString(),
        role: params.role,
        content: params.content,
      });

      return msg.save();
    } else {
      if (!this.convRepo || !this.msgRepo) {
        throw new Error(
          "Repositorios TypeORM no disponibles (DB_DRIVER no SQL)"
        );
      }

      const conversation = await this.convRepo.findOne({
        where: { id: params.conversationId },
      });
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const msg = this.msgRepo.create({
        conversation,
        role: params.role,
        content: params.content,
      });

      return this.msgRepo.save(msg);
    }
  }
}

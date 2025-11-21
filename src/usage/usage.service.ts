// src/usage/usage.service.ts
import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";

import { Usage } from "./entities/usage.entity";
import { UsageMongo, UsageMongoDocument } from "./schema/usage.schema";

export interface LogUsageParams {
  provider: string;
  model: string;
  userId?: string | null;
  conversationId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
}

@Injectable()
export class UsageService {
  private readonly useMongo: boolean;

  constructor(
    private readonly config: ConfigService,

    @InjectRepository(Usage)
    @Optional()
    private readonly usageRepo?: Repository<Usage>,

    @InjectModel(UsageMongo.name)
    @Optional()
    private readonly usageModel?: Model<UsageMongoDocument>
  ) {
    this.useMongo = this.config.get<string>("DB_DRIVER") === "mongodb";
  }

  /**
   * Registro principal de consumo de tokens.
   * Puede llamarse desde el orquestador de LLM.
   */
  async logUsage(params: LogUsageParams): Promise<any> {
    const {
      provider,
      model,
      userId = null,
      conversationId = null,
      inputTokens = null,
      outputTokens = null,
    } = params;

    let totalTokens = params.totalTokens;

    if (totalTokens == null) {
      const inTok = inputTokens ?? 0;
      const outTok = outputTokens ?? 0;
      totalTokens = inTok + outTok;
    }

    // Nos aseguramos de que siempre haya un número
    if (totalTokens == null) {
      totalTokens = 0;
    }

    if (this.useMongo) {
      if (!this.usageModel) {
        throw new Error("UsageModel no disponible (Mongo)");
      }

      const doc = new this.usageModel({
        provider,
        model,
        userId: userId ?? undefined,
        conversationId: conversationId ?? undefined,
        inputTokens: inputTokens ?? undefined,
        outputTokens: outputTokens ?? undefined,
        totalTokens,
      });

      return doc.save();
    } else {
      if (!this.usageRepo) {
        throw new Error("UsageRepository no disponible (SQL)");
      }

      const usage = this.usageRepo.create({
        provider,
        model,
        userId,
        conversationId,
        inputTokens,
        outputTokens,
        totalTokens,
      });

      return this.usageRepo.save(usage);
    }
  }

  // --- Endpoints básicos de lectura para el controller ---

  async findAll(): Promise<any[]> {
    if (this.useMongo) {
      if (!this.usageModel) {
        throw new Error("UsageModel no disponible (Mongo)");
      }
      return this.usageModel
        .find()
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean()
        .exec();
    } else {
      if (!this.usageRepo) {
        throw new Error("UsageRepository no disponible (SQL)");
      }
      return this.usageRepo.find({
        order: { createdAt: "DESC" },
        take: 1000,
      });
    }
  }

  async findByUser(userId: string): Promise<any[]> {
    if (this.useMongo) {
      if (!this.usageModel) {
        throw new Error("UsageModel no disponible (Mongo)");
      }
      return this.usageModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    } else {
      if (!this.usageRepo) {
        throw new Error("UsageRepository no disponible (SQL)");
      }
      return this.usageRepo.find({
        where: { userId },
        order: { createdAt: "DESC" },
      });
    }
  }

  async findByConversation(conversationId: string): Promise<any[]> {
    if (this.useMongo) {
      if (!this.usageModel) {
        throw new Error("UsageModel no disponible (Mongo)");
      }
      return this.usageModel
        .find({ conversationId })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    } else {
      if (!this.usageRepo) {
        throw new Error("UsageRepository no disponible (SQL)");
      }
      return this.usageRepo.find({
        where: { conversationId },
        order: { createdAt: "DESC" },
      });
    }
  }
}

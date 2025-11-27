// src/env-config/env-config.service.ts
import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";

import { EnvVar } from "./entities/env-var.entity";
import { EnvVarMongo, EnvVarMongoDocument } from "./schema/env-var.schema";
import { CreateEnvVarDto } from "./dto/create-env-var.dto";
import { UpdateEnvVarDto } from "./dto/update-env-var.dto";

@Injectable()
export class EnvConfigService {
  private readonly useMongo: boolean;

  constructor(
    private readonly config: ConfigService,

    @InjectRepository(EnvVar)
    @Optional()
    private readonly envRepo?: Repository<EnvVar>,

    @InjectModel(EnvVarMongo.name)
    @Optional()
    private readonly envModel?: Model<EnvVarMongoDocument>
  ) {
    this.useMongo = this.config.get<string>("DB_DRIVER") === "mongodb";
  }

  async findAll(): Promise<any[]> {
    if (this.useMongo) {
      if (!this.envModel) {
        throw new Error("EnvVarModel no disponible (Mongo)");
      }
      return this.envModel.find().sort({ key: 1 }).lean().exec();
    } else {
      if (!this.envRepo) {
        throw new Error("EnvVarRepository no disponible (SQL)");
      }
      return this.envRepo.find({
        order: { key: "ASC" },
      });
    }
  }

  async findOne(id: string): Promise<any | null> {
    if (this.useMongo) {
      if (!this.envModel) {
        throw new Error("EnvVarModel no disponible (Mongo)");
      }
      return this.envModel.findById(id).lean().exec();
    } else {
      if (!this.envRepo) {
        throw new Error("EnvVarRepository no disponible (SQL)");
      }
      return this.envRepo.findOne({ where: { id } });
    }
  }

  async findByKey(key: string): Promise<any | null> {
    if (this.useMongo) {
      if (!this.envModel) {
        throw new Error("EnvVarModel no disponible (Mongo)");
      }
      return this.envModel.findOne({ key }).lean().exec();
    } else {
      if (!this.envRepo) {
        throw new Error("EnvVarRepository no disponible (SQL)");
      }
      return this.envRepo.findOne({ where: { key } });
    }
  }

  async create(dto: CreateEnvVarDto): Promise<any> {
    if (this.useMongo) {
      if (!this.envModel) {
        throw new Error("EnvVarModel no disponible (Mongo)");
      }
      const doc = new this.envModel(dto);
      return doc.save();
    } else {
      if (!this.envRepo) {
        throw new Error("EnvVarRepository no disponible (SQL)");
      }
      const envVar = this.envRepo.create(dto);
      return this.envRepo.save(envVar);
    }
  }

  async update(id: string, dto: UpdateEnvVarDto): Promise<any | null> {
    if (this.useMongo) {
      if (!this.envModel) {
        throw new Error("EnvVarModel no disponible (Mongo)");
      }
      return this.envModel
        .findByIdAndUpdate(id, { $set: dto }, { new: true })
        .exec();
    } else {
      if (!this.envRepo) {
        throw new Error("EnvVarRepository no disponible (SQL)");
      }
      const envVar = await this.envRepo.findOne({ where: { id } });
      if (!envVar) return null;
      Object.assign(envVar, dto);
      return this.envRepo.save(envVar);
    }
  }

  async remove(id: string): Promise<void> {
    if (this.useMongo) {
      if (!this.envModel) {
        throw new Error("EnvVarModel no disponible (Mongo)");
      }
      await this.envModel.findByIdAndDelete(id).exec();
    } else {
      if (!this.envRepo) {
        throw new Error("EnvVarRepository no disponible (SQL)");
      }
      await this.envRepo.delete({ id });
    }
  }
}

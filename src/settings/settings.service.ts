// src/settings/settings.service.ts
import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";

import { Setting } from "./entities/setting.entity";
import { SettingMongo, SettingMongoDocument } from "./schema/setting.schema";
import { CreateSettingDto } from "./dto/create-setting.dto";
import { UpdateSettingDto } from "./dto/update-setting.dto";

@Injectable()
export class SettingsService {
  private readonly useMongo: boolean;

  constructor(
    private readonly config: ConfigService,

    @InjectRepository(Setting)
    @Optional()
    private readonly settingRepo?: Repository<Setting>,

    @InjectModel(SettingMongo.name)
    @Optional()
    private readonly settingModel?: Model<SettingMongoDocument>
  ) {
    this.useMongo = this.config.get<string>("DB_DRIVER") === "mongodb";
  }

  // -------- CRUD básico (para el controller) --------

  async create(dto: CreateSettingDto): Promise<any> {
    if (this.useMongo) {
      if (!this.settingModel) {
        throw new Error("SettingModel no disponible (Mongo)");
      }
      const doc = new this.settingModel(dto);
      return doc.save();
    } else {
      if (!this.settingRepo) {
        throw new Error("SettingRepository no disponible (SQL)");
      }
      const setting = this.settingRepo.create(dto);
      return this.settingRepo.save(setting);
    }
  }

  async findAll(): Promise<any[]> {
    if (this.useMongo) {
      if (!this.settingModel) {
        throw new Error("SettingModel no disponible (Mongo)");
      }
      return this.settingModel.find().exec();
    } else {
      if (!this.settingRepo) {
        throw new Error("SettingRepository no disponible (SQL)");
      }
      return this.settingRepo.find();
    }
  }

  async findOne(id: string): Promise<any | null> {
    if (this.useMongo) {
      if (!this.settingModel) {
        throw new Error("SettingModel no disponible (Mongo)");
      }
      return this.settingModel.findById(id).exec();
    } else {
      if (!this.settingRepo) {
        throw new Error("SettingRepository no disponible (SQL)");
      }
      return this.settingRepo.findOne({ where: { id } });
    }
  }

  async update(id: string, dto: UpdateSettingDto): Promise<any | null> {
    if (this.useMongo) {
      if (!this.settingModel) {
        throw new Error("SettingModel no disponible (Mongo)");
      }
      return this.settingModel
        .findByIdAndUpdate(id, { $set: dto }, { new: true })
        .exec();
    } else {
      if (!this.settingRepo) {
        throw new Error("SettingRepository no disponible (SQL)");
      }
      const setting = await this.settingRepo.findOne({ where: { id } });
      if (!setting) return null;
      Object.assign(setting, dto);
      return this.settingRepo.save(setting);
    }
  }

  async remove(id: string): Promise<void> {
    if (this.useMongo) {
      if (!this.settingModel) {
        throw new Error("SettingModel no disponible (Mongo)");
      }
      await this.settingModel.findByIdAndDelete(id).exec();
    } else {
      if (!this.settingRepo) {
        throw new Error("SettingRepository no disponible (SQL)");
      }
      await this.settingRepo.delete({ id });
    }
  }

  // -------- Helpers para prompt, etc. --------

  async getValue<T = any>(
    key: string,
    scope: string | null = null
  ): Promise<T | null> {
    const scopeToUse = scope ?? "global";

    if (this.useMongo) {
      if (!this.settingModel) {
        throw new Error("SettingModel no disponible (Mongo)");
      }
      const doc = await this.settingModel
        .findOne({ key, scope: scopeToUse })
        .lean();
      return (doc?.value as T) ?? null;
    } else {
      if (!this.settingRepo) {
        throw new Error("SettingRepository no disponible (SQL)");
      }
      const setting = await this.settingRepo.findOne({
        where: { key, scope: scopeToUse },
      });
      return (setting?.value as T) ?? null;
    }
  }

  async setValue(
    key: string,
    value: any,
    scope: string | null = null
  ): Promise<any> {
    const scopeToUse = scope ?? "global";

    if (this.useMongo) {
      if (!this.settingModel) {
        throw new Error("SettingModel no disponible (Mongo)");
      }
      return this.settingModel
        .findOneAndUpdate(
          { key, scope: scopeToUse },
          { $set: { value } },
          { upsert: true, new: true }
        )
        .exec();
    } else {
      if (!this.settingRepo) {
        throw new Error("SettingRepository no disponible (SQL)");
      }
      let setting = await this.settingRepo.findOne({
        where: { key, scope: scopeToUse },
      });
      if (!setting) {
        setting = this.settingRepo.create({
          key,
          scope: scopeToUse,
          value,
        });
      } else {
        setting.value = value;
      }
      return this.settingRepo.save(setting);
    }
  }
}

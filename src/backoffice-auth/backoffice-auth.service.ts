// src/backoffice-auth/backoffice-auth.service.ts
import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

import { BackofficeAdmin } from "./entities/backoffice-admin.entity";
import {
  BackofficeAdminMongo,
  BackofficeAdminMongoDocument,
} from "./schema/backoffice-admin.schema";

@Injectable()
export class BackofficeAuthService {
  private readonly useMongo: boolean;

  constructor(
    private readonly config: ConfigService,

    @InjectRepository(BackofficeAdmin)
    @Optional()
    private readonly adminRepo?: Repository<BackofficeAdmin>,

    @InjectModel(BackofficeAdminMongo.name)
    @Optional()
    private readonly adminModel?: Model<BackofficeAdminMongoDocument>
  ) {
    this.useMongo = this.config.get<string>("DB_DRIVER") === "mongodb";
  }

  async findByEmail(email: string): Promise<any | null> {
    if (this.useMongo) {
      if (!this.adminModel) {
        throw new Error("BackofficeAdminModel no disponible (Mongo)");
      }
      return this.adminModel.findOne({ email }).lean().exec();
    } else {
      if (!this.adminRepo) {
        throw new Error("BackofficeAdminRepository no disponible (SQL)");
      }
      return this.adminRepo.findOne({ where: { email } });
    }
  }

  async validateCredentials(
    email: string,
    password: string
  ): Promise<any | null> {
    const admin = await this.findByEmail(email);
    if (!admin) return null;

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return null;

    return admin;
  }
}

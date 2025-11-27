// src/backoffice-auth/backoffice-auth.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";

import { BackofficeAuthService } from "./backoffice-auth.service";
import { BackofficeAdmin } from "./entities/backoffice-admin.entity";
import {
  BackofficeAdminMongo,
  BackofficeAdminMongoSchema,
} from "./schema/backoffice-admin.schema";

const isMongo = process.env.DB_DRIVER === "mongodb";

const typeOrmImports = isMongo
  ? []
  : [TypeOrmModule.forFeature([BackofficeAdmin])];
const mongooseImports = isMongo
  ? [
      MongooseModule.forFeature([
        { name: BackofficeAdminMongo.name, schema: BackofficeAdminMongoSchema },
      ]),
    ]
  : [];

@Module({
  imports: [ConfigModule, ...typeOrmImports, ...mongooseImports],
  providers: [BackofficeAuthService],
  exports: [BackofficeAuthService],
})
export class BackofficeAuthModule {}

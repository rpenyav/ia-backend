// src/env-config/env-config.module.ts
import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";

import { EnvConfigService } from "./env-config.service";

import { EnvVar } from "./entities/env-var.entity";
import { EnvVarMongo, EnvVarMongoSchema } from "./schema/env-var.schema";
import { EnvConfigController } from "./env-config.controller";

@Module({})
export class EnvConfigModule {
  static register(): DynamicModule {
    const useMongo = process.env.DB_DRIVER === "mongodb";

    const imports: any[] = [TypeOrmModule.forFeature([EnvVar])];

    if (useMongo) {
      imports.push(
        MongooseModule.forFeature([
          { name: EnvVarMongo.name, schema: EnvVarMongoSchema },
        ])
      );
    }

    return {
      module: EnvConfigModule,
      imports,
      controllers: [EnvConfigController],
      providers: [EnvConfigService],
      exports: [EnvConfigService],
    };
  }
}

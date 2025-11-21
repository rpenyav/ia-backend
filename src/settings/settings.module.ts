// src/settings/settings.module.ts
import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";

import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { Setting } from "./entities/setting.entity";
import { SettingMongo, SettingMongoSchema } from "./schema/setting.schema";

@Module({})
export class SettingsModule {
  static register(): DynamicModule {
    const useMongo = process.env.DB_DRIVER === "mongodb";

    const imports: any[] = [TypeOrmModule.forFeature([Setting])];

    if (useMongo) {
      imports.push(
        MongooseModule.forFeature([
          { name: SettingMongo.name, schema: SettingMongoSchema },
        ])
      );
    }

    return {
      module: SettingsModule,
      imports,
      controllers: [SettingsController],
      providers: [SettingsService],
      exports: [SettingsService],
    };
  }
}

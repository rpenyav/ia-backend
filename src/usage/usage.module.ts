// src/usage/usage.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";

import { Usage } from "./entities/usage.entity";
import { UsageMongo, UsageMongoSchema } from "./schema/usage.schema";
import { UsageService } from "./usage.service";
import { UsageController } from "./usage.controller";

// Decidimos en tiempo de carga si añadimos los modelos de Mongo
const useMongo = process.env.DB_DRIVER === "mongodb";

const mongoImports = useMongo
  ? [
      MongooseModule.forFeature([
        { name: UsageMongo.name, schema: UsageMongoSchema },
      ]),
    ]
  : [];

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Usage]), ...mongoImports],
  controllers: [UsageController], // 👈 ahora exponemos rutas HTTP
  providers: [UsageService],
  exports: [UsageService], // 👈 para que LlmModule pueda inyectarlo
})
export class UsageModule {}

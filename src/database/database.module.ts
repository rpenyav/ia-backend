// src/database/database.module.ts
import { DynamicModule, Module } from "@nestjs/common";
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";

type SupportedDrivers = "postgres" | "mysql" | "mariadb" | "mongodb";

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const driver = (process.env.DB_DRIVER as SupportedDrivers) || "postgres";

    // 👇 IMPORTANTE: tipamos el array para evitar el error de "never"
    const imports: any[] = [];

    if (driver === "mongodb") {
      // 🔹 MONGODB (Mongoose)
      imports.push(
        MongooseModule.forRootAsync({
          imports: [NestConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const uriFromEnv = config.get<string>("DB_URL");

            // Si no hay DB_URL, construimos la URI con los campos sueltos
            const host = config.get<string>("DB_HOST");
            const port = config.get<number>("DB_PORT");
            const user = config.get<string>("DB_USER");
            const pass = config.get<string>("DB_PASSWORD");
            const name = config.get<string>("DB_NAME");

            // OJO: ajusta si tu Mongo no usa user/pass o usa SRV (mongodb+srv)
            const fallbackUri = `mongodb://${user}:${pass}@${host}:${port}/${name}`;

            return {
              uri: uriFromEnv || fallbackUri,
            };
          },
        })
      );
    } else {
      // 🔹 SQL (Postgres / MySQL / MariaDB) usando TypeORM
      imports.push(
        TypeOrmModule.forRootAsync({
          imports: [NestConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const url = config.get<string>("DB_URL");

            return {
              type: driver,
              // Si hay DB_URL la usamos; si no, tiramos de los campos sueltos
              url: url || undefined,
              host: url ? undefined : config.get<string>("DB_HOST"),
              port: url ? undefined : config.get<number>("DB_PORT"),
              username: url ? undefined : config.get<string>("DB_USER"),
              password: url ? undefined : config.get<string>("DB_PASSWORD"),
              database: url ? undefined : config.get<string>("DB_NAME"),

              autoLoadEntities: true, // Las entidades se cargan solas desde los módulos
              synchronize: false, // IMPORTANTE: usar migraciones en producción
            };
          },
        })
      );
    }

    return {
      module: DatabaseModule,
      imports,
      exports: imports,
    };
  }
}

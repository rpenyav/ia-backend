// src/config/config.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import * as Joi from "joi";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid("development", "production", "test")
          .default("production"),
        PORT: Joi.number().default(3000),

        ALLOWED_ORIGINS: Joi.string().required(),
        APP_ID: Joi.string().default("default-app"),

        AUTH_STRATEGY: Joi.string()
          .valid("none", "api_key", "oauth2")
          .default("api_key"),
        INTERNAL_API_KEY: Joi.when("AUTH_STRATEGY", {
          is: "api_key",
          then: Joi.string().min(16).required(),
          otherwise: Joi.string().optional(),
        }),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default("1h"),

        CHAT_AUTH_MODE: Joi.string()
          .valid("none", "local", "oauth2")
          .default("none"),

        DB_DRIVER: Joi.string()
          .valid("postgres", "mysql", "mariadb", "mongodb")
          .required(),
        DB_HOST: Joi.string().optional(),
        DB_PORT: Joi.number().optional(),
        DB_USER: Joi.string().optional(),
        DB_PASSWORD: Joi.string().optional(),
        DB_NAME: Joi.string().optional(),
        DB_URL: Joi.string()
          .uri({
            scheme: ["mongodb", "mongodb+srv", "mysql", "postgres", "mariadb"],
          })
          .optional(),

        DEFAULT_LLM_PROVIDER: Joi.string()
          .valid("openai", "gemini", "grok", "deepseek")
          .default("openai"),
        DEFAULT_LLM_MODEL: Joi.string().default("gpt-4.1-mini"),
        DEFAULT_LLM_TEMPERATURE: Joi.number().min(0).max(2).default(0.2),
        DEFAULT_LLM_MAX_TOKENS: Joi.number().min(1).default(2048),

        OPENAI_API_KEY: Joi.string().optional(),
        GEMINI_API_KEY: Joi.string().optional(),
        GROK_API_KEY: Joi.string().optional(),
        DEEPSEEK_API_KEY: Joi.string().optional(),

        OPENAI_BASE_URL: Joi.string().uri().optional(),
        GEMINI_BASE_URL: Joi.string().uri().optional(),
        GROK_BASE_URL: Joi.string().uri().optional(),
        DEEPSEEK_BASE_URL: Joi.string().uri().optional(),

        HTTP_PROXY: Joi.string().allow("").optional(),
        HTTPS_PROXY: Joi.string().allow("").optional(),

        LOG_LEVEL: Joi.string()
          .valid("debug", "info", "warn", "error")
          .default("info"),
        HTTP_LOGGING_ENABLED: Joi.boolean().default(true),

        METRICS_ENABLED: Joi.boolean().default(false),
        METRICS_PORT: Joi.number().default(9100),

        // src/config/config.module.ts (solo el trozo de STORAGE)
        STORAGE_PROVIDER: Joi.string()
          .valid("cloudinary", "s3", "local")
          .default("cloudinary"),

        CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
        CLOUDINARY_API_KEY: Joi.string().optional(),
        CLOUDINARY_API_SECRET: Joi.string().optional(),

        // S3 / MinIO: solo requeridos si STORAGE_PROVIDER = 's3'
        S3_ENDPOINT: Joi.when("STORAGE_PROVIDER", {
          is: "s3",
          then: Joi.string().uri().required(),
          otherwise: Joi.string().optional().allow(""),
        }),
        S3_REGION: Joi.when("STORAGE_PROVIDER", {
          is: "s3",
          then: Joi.string().required(),
          otherwise: Joi.string().optional().allow(""),
        }),
        S3_BUCKET: Joi.when("STORAGE_PROVIDER", {
          is: "s3",
          then: Joi.string().required(),
          otherwise: Joi.string().optional().allow(""),
        }),
        S3_ACCESS_KEY_ID: Joi.when("STORAGE_PROVIDER", {
          is: "s3",
          then: Joi.string().required(),
          otherwise: Joi.string().optional().allow(""),
        }),
        S3_SECRET_ACCESS_KEY: Joi.when("STORAGE_PROVIDER", {
          is: "s3",
          then: Joi.string().required(),
          otherwise: Joi.string().optional().allow(""),
        }),
      }),
    }),
  ],
})
export class ConfigModule {}

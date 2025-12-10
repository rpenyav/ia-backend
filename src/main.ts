// src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // =========================
  // CORS
  // =========================
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  const allowedHeaders = [
    "Content-Type",
    "Authorization", // 👈 IMPORTANTE para el Bearer token
    "x-api-key",
  ];

  console.log("[CORS] ALLOWED_ORIGINS:", allowedOrigins);
  console.log("[CORS] ALLOWED_HEADERS:", allowedHeaders);

  app.enableCors({
    origin:
      allowedOrigins.length > 0
        ? (origin, callback) => {
            // peticiones sin origin (ej. curl, Postman) → OK
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
              return callback(null, true);
            }

            console.warn("[CORS] Origin no permitido:", origin);
            return callback(null, false);
          }
        : true, // si no hay lista, permite todos
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders, // 👈 aquí va Authorization
    credentials: true,
  });

  // =========================
  // Vistas estáticas / hbs
  // =========================
  const viewsPath = join(process.cwd(), "src", "views");
  console.log("Views dir:", viewsPath);

  app.setBaseViewsDir(viewsPath);
  app.setViewEngine("hbs");

  app.useStaticAssets(join(process.cwd(), "public"), {
    prefix: "/static/",
  });

  app.use(cookieParser(process.env.JWT_SECRET || "dev_cookie_secret"));

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 8080;
  await app.listen(port, "0.0.0.0");
  console.log(`🚀 App listening on port ${port}`);
}
bootstrap();

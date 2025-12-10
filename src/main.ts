// src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // --- CORS: versión sencilla y robusta para dev ---
  const raw = process.env.ALLOWED_ORIGINS || "";
  const allowedOrigins = raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0)
    .map((o) => o.replace(/\/$/, "")); // quitar barra final

  console.log("[CORS] ALLOWED_ORIGINS:", allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // Peticiones sin Origin (Postman, curl, etc.) → permitir
      if (!origin) {
        console.log("[CORS] Petición sin Origin -> permitido");
        return callback(null, true);
      }

      const normalized = origin.replace(/\/$/, "");
      const isAllowed =
        allowedOrigins.length === 0 || allowedOrigins.includes(normalized);

      console.log(
        "[CORS] Origin recibido:",
        origin,
        "=> normalizado:",
        normalized,
        "=> permitido:",
        isAllowed
      );

      if (isAllowed) {
        // ✅ devolvemos true → el middleware cors echa atrás el mismo Origin
        return callback(null, true);
      }

      console.warn(
        "[CORS] Origin NO permitido:",
        origin,
        "Lista:",
        allowedOrigins
      );
      return callback(new Error("Not allowed by CORS"), false);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "*",
    credentials: true,
  });

  // Vistas
  const viewsPath = join(process.cwd(), "src", "views");
  console.log("Views dir:", viewsPath);

  app.setBaseViewsDir(viewsPath);
  app.setViewEngine("hbs");

  app.useStaticAssets(join(process.cwd(), "public"), {
    prefix: "/static/",
  });

  app.use(cookieParser(process.env.JWT_SECRET || "dev_cookie_secret"));

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

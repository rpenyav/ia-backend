// src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  // app.enableCors({
  //   origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  //   methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  //   allowedHeaders: "Content-Type, Authorization, x-api-key",
  //   credentials: true,
  // });

  // CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  app.enableCors({
    origin: (origin, callback) => {
      // llamadas server-to-server o desde curl (sin Origin)
      if (!origin) {
        return callback(null, true);
      }

      // si no has definido ALLOWED_ORIGINS, permite todo (modo dev)
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // origen no permitido
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization, x-api-key",
    credentials: true,
  });

  // 👇 Vistas: src/views desde la raíz del proyecto
  const viewsPath = join(process.cwd(), "src", "views");
  console.log("Views dir:", viewsPath);

  app.setBaseViewsDir(viewsPath);
  app.setViewEngine("hbs");

  app.useStaticAssets(join(process.cwd(), "public"), {
    prefix: "/static/", // URL base de los estáticos
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

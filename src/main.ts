import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  console.log("DEBUG ENV:", {
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    AUTH_STRATEGY: process.env.AUTH_STRATEGY,
  });
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // lanza error si te mandan propiedades extra
      transform: true, // convierte tipos (string -> number, etc.)
    })
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 App listening on port ${port}`);
}
bootstrap();

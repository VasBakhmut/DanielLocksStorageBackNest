import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnvironment } from "./config/environment";

async function bootstrap() {
  loadEnvironment();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000"
    )
      .split(",")
      .map((value) => value.trim()),
  });
  app.enableShutdownHooks();
  await app.listen(
    Number(process.env.PORT || 3001),
    process.env.HOST || (process.env.RAILWAY_ENVIRONMENT_ID ? "0.0.0.0" : "127.0.0.1"),
  );
}
bootstrap();

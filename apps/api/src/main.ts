import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const configService = app.get(ConfigService);
  const host = configService.get<string>("API_HOST") ?? "0.0.0.0";
  const port = configService.get<number>("API_PORT") ?? 3001;
  const corsOrigin = configService.get<string>("CORS_ORIGIN");

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin
    });
  }

  await app.listen(port, host);

  const logger = new Logger("Bootstrap");
  logger.log(`API listening on http://${host}:${port}/api/v1`);
}

void bootstrap();

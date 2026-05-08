import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

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
  const docsEnabledRaw = configService.get<string>("API_DOCS_ENABLED") ?? "true";
  const docsEnabled = !["0", "false", "no", "off"].includes(docsEnabledRaw.toLowerCase());

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

  if (docsEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Tabletop Booking API")
      .setDescription("REST API for the Tabletop Booking system")
      .setVersion("0.1.0")
      .addServer("/api/v1")
      .addBearerAuth(
        {
          bearerFormat: "JWT",
          scheme: "bearer",
          type: "http"
        },
        "bearer"
      )
      .addTag("system", "System and bootstrap endpoints")
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
      ignoreGlobalPrefix: false
    });
    SwaggerModule.setup("api/docs", app, swaggerDocument, {
      customSiteTitle: "Tabletop Booking API Docs"
    });
  }

  await app.listen(port, host);

  const logger = new Logger("Bootstrap");
  logger.log(`API listening on http://${host}:${port}/api/v1`);
  if (docsEnabled) {
    logger.log(`Swagger docs available at http://${host}:${port}/api/docs`);
  }
}

void bootstrap();

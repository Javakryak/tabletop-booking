import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";

import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor.js";
import { logStructured } from "./common/logging/structured-log.js";

type HttpRequestWithTrace = {
  correlationId?: string;
  headers?: Record<string, string | string[] | undefined>;
  requestId?: string;
};

type HttpResponseWithTrace = {
  setHeader: (name: string, value: string) => void;
};

type NextCallback = () => void;

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
  app.use((request: HttpRequestWithTrace, response: HttpResponseWithTrace, next: NextCallback) => {
    const traceId = resolveTraceId(request.headers);
    request.requestId = traceId;
    request.correlationId = traceId;
    response.setHeader("x-request-id", traceId);
    response.setHeader("x-correlation-id", traceId);
    next();
  });
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
      .addTag("auth", "Authentication and session endpoints")
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

  logStructured("info", "bootstrap.startup", {
    host,
    message: "API listening",
    port,
    requestId: null,
    url: `http://${host}:${port}/api/v1`
  });
  if (docsEnabled) {
    logStructured("info", "bootstrap.startup", {
      host,
      message: "Swagger docs available",
      port,
      requestId: null,
      url: `http://${host}:${port}/api/docs`
    });
  }
}

function resolveTraceId(headers: Record<string, string | string[] | undefined> | undefined): string {
  const fromCorrelationHeader = pickHeader(headers, "x-correlation-id");
  const fromRequestHeader = pickHeader(headers, "x-request-id");
  const candidate = fromCorrelationHeader ?? fromRequestHeader;

  if (!candidate) {
    return randomUUID();
  }

  return candidate.slice(0, 128);
}

function pickHeader(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | null {
  const value = headers?.[name];
  const pickedValue = Array.isArray(value) ? value[0] : value;

  if (typeof pickedValue !== "string") {
    return null;
  }

  const trimmed = pickedValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

void bootstrap();

import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";

import { logStructured } from "../logging/structured-log.js";

type HttpRequestShape = {
  correlationId?: string;
  method?: string;
  originalUrl?: string;
  requestId?: string;
  url?: string;
};

type HttpResponseShape = {
  status: (code: number) => HttpResponseShape;
  json: (payload: unknown) => void;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<HttpRequestShape>();
    const response = context.getResponse<HttpResponseShape>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : Array.isArray((exceptionResponse as { message?: unknown })?.message)
          ? (exceptionResponse as { message: string[] }).message
          : ((exceptionResponse as { message?: string })?.message ?? "Internal server error");
    const error =
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null &&
      "error" in exceptionResponse
        ? String((exceptionResponse as { error?: unknown }).error)
        : isHttpException
          ? exception.constructor.name
          : "InternalServerError";

    const payload = {
      error,
      message,
      path: request.originalUrl ?? request.url ?? "",
      requestId: request.requestId ?? request.correlationId ?? null,
      statusCode,
      timestamp: new Date().toISOString()
    };

    logStructured("error", "http.request.failed", {
      error,
      exceptionName: exception instanceof Error ? exception.name : null,
      message,
      method: request.method ?? "",
      path: payload.path,
      requestId: payload.requestId,
      stack: exception instanceof Error ? exception.stack : undefined,
      statusCode
    });

    response.status(statusCode).json(payload);
  }
}

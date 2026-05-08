import {
  CallHandler,
  ExecutionContext,
  Injectable,
  type NestInterceptor
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { finalize, type Observable } from "rxjs";

import { logStructured } from "../logging/structured-log.js";

type HttpRequestShape = {
  headers?: Record<string, string | string[] | undefined>;
  correlationId?: string;
  method?: string;
  originalUrl?: string;
  requestId?: string;
  url?: string;
};

type HttpResponseShape = {
  setHeader: (name: string, value: string) => void;
  statusCode: number;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequestShape>();
    const response = http.getResponse<HttpResponseShape>();
    const startedAt = Date.now();
    const requestId =
      typeof request.requestId === "string" && request.requestId.length > 0
        ? request.requestId
        : this.resolveRequestId(request.headers);

    request.requestId = requestId;
    request.correlationId = requestId;
    response.setHeader("x-request-id", requestId);
    response.setHeader("x-correlation-id", requestId);

    return next.handle().pipe(
      finalize(() => {
        logStructured("info", "http.request.completed", {
          durationMs: Date.now() - startedAt,
          method: request.method ?? "",
          path: request.originalUrl ?? request.url ?? "",
          requestId,
          statusCode: response.statusCode
        });
      })
    );
  }

  private resolveRequestId(
    headers: Record<string, string | string[] | undefined> | undefined
  ): string {
    const fromCorrelationHeader = this.pickHeader(headers, "x-correlation-id");
    const fromRequestHeader = this.pickHeader(headers, "x-request-id");
    const candidate = fromCorrelationHeader ?? fromRequestHeader;

    if (!candidate) {
      return randomUUID();
    }

    return candidate.slice(0, 128);
  }

  private pickHeader(
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
}

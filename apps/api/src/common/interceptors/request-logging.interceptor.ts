import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { finalize, type Observable } from "rxjs";

type HttpRequestShape = {
  headers?: Record<string, string | string[] | undefined>;
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
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequestShape>();
    const response = http.getResponse<HttpResponseShape>();
    const startedAt = Date.now();
    const headerValue = request.headers?.["x-request-id"];
    const requestId =
      typeof headerValue === "string" && headerValue.length > 0 ? headerValue : randomUUID();

    request.requestId = requestId;
    response.setHeader("x-request-id", requestId);

    return next.handle().pipe(
      finalize(() => {
        this.logger.log(
          JSON.stringify({
            durationMs: Date.now() - startedAt,
            method: request.method ?? "",
            path: request.originalUrl ?? request.url ?? "",
            requestId,
            statusCode: response.statusCode
          })
        );
      })
    );
  }
}

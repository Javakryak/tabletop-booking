import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";

import { type Bot, webhookCallback } from "grammy";

export const TELEGRAM_WEBHOOK_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export interface TelegramWebhookServerConfig {
  host: string;
  path: string;
  port: number;
  secretToken: string;
}

interface WebhookValidationResult {
  ok: boolean;
  reason?: string;
  statusCode?: number;
}

function getRequestPath(request: IncomingMessage): string {
  const rawUrl = request.url ?? "/";
  return new URL(rawUrl, "http://localhost").pathname;
}

function writeResponse(response: ServerResponse, statusCode: number, message: string): void {
  if (response.writableEnded || response.headersSent) {
    return;
  }

  response.statusCode = statusCode;
  response.setHeader("content-type", "text/plain; charset=utf-8");
  response.end(message);
}

function isMatchingSecretToken(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function validateTelegramWebhookRequest(
  request: IncomingMessage,
  config: Pick<TelegramWebhookServerConfig, "path" | "secretToken">
): WebhookValidationResult {
  if (request.method !== "POST") {
    return { ok: false, reason: "Method not allowed", statusCode: 405 };
  }

  if (getRequestPath(request) !== config.path) {
    return { ok: false, reason: "Not found", statusCode: 404 };
  }

  const secretHeader = request.headers[TELEGRAM_WEBHOOK_SECRET_HEADER];
  if (typeof secretHeader !== "string" || !isMatchingSecretToken(secretHeader, config.secretToken)) {
    return { ok: false, reason: "Unauthorized", statusCode: 401 };
  }

  return { ok: true };
}

export function createTelegramWebhookRequestHandler(
  bot: Bot,
  config: Pick<TelegramWebhookServerConfig, "path" | "secretToken">
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  const handleWebhookUpdate = webhookCallback(bot, "http");

  return async (request, response) => {
    const validation = validateTelegramWebhookRequest(request, config);
    if (!validation.ok) {
      writeResponse(response, validation.statusCode ?? 400, validation.reason ?? "Bad request");
      return;
    }

    try {
      await handleWebhookUpdate(request, response);
    } catch {
      writeResponse(response, 500, "Internal server error");
    }
  };
}

export async function startTelegramWebhookServer(
  bot: Bot,
  config: TelegramWebhookServerConfig
): Promise<Server> {
  const handleRequest = createTelegramWebhookRequestHandler(bot, config);
  const server = createServer((request, response) => {
    void handleRequest(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(config.port, config.host);
  });

  return server;
}

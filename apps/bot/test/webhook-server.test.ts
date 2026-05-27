import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  TELEGRAM_WEBHOOK_SECRET_HEADER,
  validateTelegramWebhookRequest
} from "../src/bot/webhook-server.js";

function createRequest(input: {
  method?: string;
  path?: string;
  secretHeader?: string;
}): Parameters<typeof validateTelegramWebhookRequest>[0] {
  const headers: Record<string, string> = {};
  if (input.secretHeader) {
    headers[TELEGRAM_WEBHOOK_SECRET_HEADER] = input.secretHeader;
  }

  return {
    headers,
    method: input.method ?? "POST",
    url: input.path ?? "/telegram/webhook"
  } as Parameters<typeof validateTelegramWebhookRequest>[0];
}

describe("validateTelegramWebhookRequest", () => {
  test("accepts webhook request with valid method, path, and secret", () => {
    const result = validateTelegramWebhookRequest(
      createRequest({ secretHeader: "secret-token" }),
      {
        path: "/telegram/webhook",
        secretToken: "secret-token"
      }
    );

    assert.equal(result.ok, true);
  });

  test("rejects non-POST requests", () => {
    const result = validateTelegramWebhookRequest(
      createRequest({ method: "GET", secretHeader: "secret-token" }),
      {
        path: "/telegram/webhook",
        secretToken: "secret-token"
      }
    );

    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 405);
  });

  test("rejects unknown webhook path", () => {
    const result = validateTelegramWebhookRequest(
      createRequest({ path: "/telegram/unknown", secretHeader: "secret-token" }),
      {
        path: "/telegram/webhook",
        secretToken: "secret-token"
      }
    );

    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 404);
  });

  test("rejects requests with missing or invalid secret", () => {
    const missingSecret = validateTelegramWebhookRequest(createRequest({}), {
      path: "/telegram/webhook",
      secretToken: "secret-token"
    });
    const wrongSecret = validateTelegramWebhookRequest(
      createRequest({ secretHeader: "wrong-secret" }),
      {
        path: "/telegram/webhook",
        secretToken: "secret-token"
      }
    );

    assert.equal(missingSecret.ok, false);
    assert.equal(missingSecret.statusCode, 401);
    assert.equal(wrongSecret.ok, false);
    assert.equal(wrongSecret.statusCode, 401);
  });
});

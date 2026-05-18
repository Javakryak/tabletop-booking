import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BotInternalAuthService } from "../src/internal-bot/bot-internal-auth.service.js";

test("accepts valid bot token", () => {
  const service = new BotInternalAuthService(
    {
      get(key: string) {
        if (key === "TELEGRAM_BOT_TOKEN") {
          return "expected-token";
        }

        return undefined;
      }
    } as never
  );

  assert.doesNotThrow(() => service.assertBotToken("expected-token"));
});

test("rejects invalid bot token", () => {
  const service = new BotInternalAuthService(
    {
      get() {
        return "expected-token";
      }
    } as never
  );

  assert.throws(() => service.assertBotToken("wrong-token"), UnauthorizedException);
});

test("fails when bot token is not configured", () => {
  const service = new BotInternalAuthService(
    {
      get() {
        return undefined;
      }
    } as never
  );

  assert.throws(() => service.assertBotToken("any-token"), ServiceUnavailableException);
});

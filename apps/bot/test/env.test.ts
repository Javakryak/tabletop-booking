import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { readBotEnv } from "../src/config/env.js";

describe("readBotEnv", () => {
  test("reads required polling configuration", () => {
    const config = readBotEnv({
      TELEGRAM_BOT_TOKEN: "test-token",
      TELEGRAM_UPDATE_MODE: "polling"
    });

    assert.equal(config.telegramBotToken, "test-token");
    assert.equal(config.updateMode, "polling");
    assert.equal(config.apiBaseUrl, "http://localhost:3001/api/v1");
    assert.equal(config.appBaseUrl, "http://localhost:3000");
  });

  test("requires webhook url and secret in webhook mode", () => {
    assert.throws(
      () =>
        readBotEnv({
          TELEGRAM_BOT_TOKEN: "test-token",
          TELEGRAM_UPDATE_MODE: "webhook"
        }),
      /TELEGRAM_WEBHOOK_URL/
    );
  });

  test("rejects unsupported update mode", () => {
    assert.throws(
      () =>
        readBotEnv({
          TELEGRAM_BOT_TOKEN: "test-token",
          TELEGRAM_UPDATE_MODE: "invalid-mode"
        }),
      /TELEGRAM_UPDATE_MODE/
    );
  });
});

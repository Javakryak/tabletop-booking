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
    assert.equal(config.scheduleTimezone, "Europe/Moscow");
    assert.equal(config.notificationBatchSize, 20);
    assert.equal(config.notificationPollIntervalMs, 30000);
    assert.equal(config.adminTelegramIds.size, 0);
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

  test("parses optional admin command configuration", () => {
    const config = readBotEnv({
      BOT_ADMIN_API_TOKEN: "admin-jwt",
      BOT_ADMIN_TELEGRAM_IDS: "123, 456,789",
      BOT_NOTIFICATION_BATCH_SIZE: "25",
      BOT_NOTIFICATION_POLL_INTERVAL_MS: "45000",
      BOT_SCHEDULE_TIMEZONE: "UTC",
      TELEGRAM_BOT_TOKEN: "test-token"
    });

    assert.equal(config.adminApiToken, "admin-jwt");
    assert.equal(config.scheduleTimezone, "UTC");
    assert.equal(config.notificationBatchSize, 25);
    assert.equal(config.notificationPollIntervalMs, 45000);
    assert.equal(config.adminTelegramIds.has("123"), true);
    assert.equal(config.adminTelegramIds.has("456"), true);
    assert.equal(config.adminTelegramIds.has("789"), true);
  });
});

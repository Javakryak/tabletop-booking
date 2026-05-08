import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";

import {
  verifyTelegramLoginData,
  verifyTelegramMiniAppInitData
} from "../src/auth/telegram-auth-verifier.js";

const BOT_TOKEN = "test-bot-token";

test("verifyTelegramLoginData accepts valid payload", () => {
  const now = 1_710_000_000;
  const payload = signTelegramLoginPayload(
    {
      auth_date: String(now),
      first_name: "Ivan",
      id: "123456",
      username: "ivan_user"
    },
    BOT_TOKEN
  );

  const verified = verifyTelegramLoginData(payload, BOT_TOKEN, now, 86400);

  assert.ok(verified);
  assert.equal(verified.telegramId, "123456");
  assert.equal(verified.telegramUsername, "ivan_user");
});

test("verifyTelegramLoginData rejects invalid hash", () => {
  const now = 1_710_000_000;
  const payload = signTelegramLoginPayload(
    {
      auth_date: String(now),
      first_name: "Ivan",
      id: "123456"
    },
    BOT_TOKEN
  );
  payload.hash = "0".repeat(64);

  const verified = verifyTelegramLoginData(payload, BOT_TOKEN, now, 86400);

  assert.equal(verified, null);
});

test("verifyTelegramMiniAppInitData accepts valid payload", () => {
  const now = 1_710_000_000;
  const initData = signMiniAppInitData(
    {
      auth_date: String(now),
      query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
      user: JSON.stringify({
        first_name: "Ivan",
        id: 123456,
        username: "ivan_user"
      })
    },
    BOT_TOKEN
  );

  const verified = verifyTelegramMiniAppInitData(initData, BOT_TOKEN, now, 86400);

  assert.ok(verified);
  assert.equal(verified.telegramId, "123456");
  assert.equal(verified.firstName, "Ivan");
});

test("verifyTelegramMiniAppInitData rejects expired payload", () => {
  const now = 1_710_000_000;
  const oldAuthDate = String(now - 90_000);
  const initData = signMiniAppInitData(
    {
      auth_date: oldAuthDate,
      query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
      user: JSON.stringify({
        first_name: "Ivan",
        id: 123456
      })
    },
    BOT_TOKEN
  );

  const verified = verifyTelegramMiniAppInitData(initData, BOT_TOKEN, now, 86400);

  assert.equal(verified, null);
});

function signTelegramLoginPayload(
  input: Record<string, string>,
  botToken: string
): Record<string, string> {
  const dataCheckString = Object.entries(input)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  return {
    ...input,
    hash
  };
}

function signMiniAppInitData(input: Record<string, string>, botToken: string): string {
  const dataCheckString = Object.entries(input)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const params = new URLSearchParams({
    ...input,
    hash
  });

  return params.toString();
}

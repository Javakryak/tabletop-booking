import assert from "node:assert/strict";
import { test } from "node:test";

import { linkTelegramUser } from "../src/bot/link-telegram-user.js";

test("linkTelegramUser sends request with bot token and payload", async () => {
  const calls: Array<{ init: RequestInit | undefined; input: unknown }> = [];

  const fetchMock = async (input: unknown, init?: RequestInit) => {
    calls.push({ input, init });
    return {
      ok: true,
      async json() {
        return {
          data: {
            isNewUser: true,
            profileCompleted: false,
            userId: "user-1"
          }
        };
      }
    } as Response;
  };

  const result = await linkTelegramUser(
    {
      apiBaseUrl: "http://localhost:3001/api/v1",
      botToken: "bot-token"
    },
    {
      displayName: "Иван",
      telegramId: "12345",
      telegramUsername: "ivan_user"
    },
    fetchMock
  );

  assert.equal(result.userId, "user-1");
  assert.equal(result.isNewUser, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "http://localhost:3001/api/v1/auth/telegram-bot/link");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(calls[0]?.init?.headers instanceof Headers, true);
  assert.equal((calls[0]?.init?.headers as Headers).get("x-telegram-bot-token"), "bot-token");

  const body = JSON.parse(String(calls[0]?.init?.body));
  assert.deepEqual(body, {
    displayName: "Иван",
    telegramId: "12345",
    telegramUsername: "ivan_user"
  });
});

test("linkTelegramUser throws when API returns non-ok status", async () => {
  const fetchMock = async () =>
    ({
      ok: false,
      status: 401
    }) as Response;

  await assert.rejects(
    () =>
      linkTelegramUser(
        {
          apiBaseUrl: "http://localhost:3001/api/v1",
          botToken: "bot-token"
        },
        {
          displayName: "Иван",
          telegramId: "12345",
          telegramUsername: null
        },
        fetchMock
      ),
    /status 401/
  );
});

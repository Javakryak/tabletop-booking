import assert from "node:assert/strict";
import { test } from "node:test";

import { handleStartCommand } from "../src/bot/start-command.js";

test("/start links user and sends welcome with app button", async () => {
  const replies: Array<{ extra?: unknown; text: string }> = [];

  await handleStartCommand(
    {
      from: {
        first_name: "Иван",
        id: 100500,
        username: "ivan_user"
      },
      reply: async (text: string, extra?: unknown) => {
        replies.push({ extra, text });
      }
    } as never,
    {
      appBaseUrl: "http://localhost:3000",
      linkTelegramUser: async () => ({
        isNewUser: true,
        profileCompleted: false,
        userId: "user-1"
      })
    }
  );

  assert.equal(replies.length, 1);
  const first = replies[0];
  assert.match(first?.text ?? "", /Привет/);
  assert.match(first?.text ?? "", /аккаунт/);
  assert.equal(
    (first?.extra as { reply_markup?: { inline_keyboard?: Array<Array<{ url?: string }>> } })
      ?.reply_markup?.inline_keyboard?.[0]?.[0]?.url,
    "http://localhost:3000"
  );
});

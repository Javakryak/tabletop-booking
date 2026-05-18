import assert from "node:assert/strict";
import { test } from "node:test";

import {
  USER_BOT_COMMANDS,
  handleBookCommand,
  handleCancelCommand,
  handleFindGameCommand,
  handleHelpCommand,
  handleMyBookingsCommand,
  handleMyMeetupsCommand,
  handleSettingsCommand
} from "../src/bot/user-commands.js";

test("USER_BOT_COMMANDS contains all TASK-0903 user commands", () => {
  const names = USER_BOT_COMMANDS.map((command) => command.command);
  assert.deepEqual(names, ["start", "help", "book", "my_bookings", "my_meetups", "find_game", "cancel", "settings"]);
});

test("/help shows supported commands with quick-open button", async () => {
  const replies: Array<{ extra?: unknown; text: string }> = [];

  await handleHelpCommand(
    {
      reply: async (text: string, extra?: unknown) => {
        replies.push({ extra, text });
      }
    } as never,
    { appBaseUrl: "http://localhost:3000" }
  );

  assert.equal(replies.length, 1);
  const first = replies[0];
  assert.match(first?.text ?? "", /\/book/);
  assert.equal(
    (first?.extra as { reply_markup?: { inline_keyboard?: Array<Array<{ url?: string }>> } })
      ?.reply_markup?.inline_keyboard?.[0]?.[0]?.url,
    "http://localhost:3000"
  );
});

test("command handlers provide lightweight responses with web buttons", async () => {
  const calls: Array<{ extra?: unknown; text: string }> = [];
  const context = {
    reply: async (text: string, extra?: unknown) => {
      calls.push({ extra, text });
    }
  } as never;
  const deps = { appBaseUrl: "http://localhost:3000" };

  await handleBookCommand(context, deps);
  await handleMyBookingsCommand(context, deps);
  await handleMyMeetupsCommand(context, deps);
  await handleFindGameCommand(context, deps);
  await handleCancelCommand(context, deps);
  await handleSettingsCommand(context, deps);

  assert.equal(calls.length, 6);
  assert.match(calls[0]?.text ?? "", /бронирование/i);
  assert.match(calls[2]?.text ?? "", /встреч/);
  assert.match(calls[4]?.text ?? "", /отмен/);

  const urls = calls.map(
    (item) =>
      (item.extra as { reply_markup?: { inline_keyboard?: Array<Array<{ url?: string }>> } })?.reply_markup
        ?.inline_keyboard?.[0]?.[0]?.url
  );

  assert.deepEqual(urls, [
    "http://localhost:3000/schedule",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/games",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/dashboard"
  ]);
});

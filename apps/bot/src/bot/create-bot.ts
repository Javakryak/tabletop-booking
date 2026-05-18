import { Bot } from "grammy";

import type { BotEnvConfig } from "../config/env.js";
import { linkTelegramUser } from "./link-telegram-user.js";
import { handleStartCommand } from "./start-command.js";

export function createBot(
  config: Pick<BotEnvConfig, "telegramBotToken" | "appBaseUrl" | "apiBaseUrl">
): Bot {
  const bot = new Bot(config.telegramBotToken);

  bot.command("start", async (context) => {
    await handleStartCommand(context, {
      appBaseUrl: config.appBaseUrl,
      linkTelegramUser: async (input) =>
        await linkTelegramUser(
          {
            apiBaseUrl: config.apiBaseUrl,
            botToken: config.telegramBotToken
          },
          input
        )
    });
  });

  bot.command("help", async (context) => {
    await context.reply(
      "Доступные команды сейчас: /start и /help. Команды бронирования и администрирования добавим по следующим задачам."
    );
  });

  bot.catch((error) => {
    const errorMessage = error.error instanceof Error ? error.error.message : String(error.error);

    // Log only operational metadata to avoid leaking user message contents.
    console.error("Telegram bot update handling failed", {
      updateId: error.ctx.update.update_id,
      error: errorMessage
    });
  });

  return bot;
}

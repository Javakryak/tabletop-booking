import { Bot } from "grammy";

import type { BotEnvConfig } from "../config/env.js";

export function createBot(config: Pick<BotEnvConfig, "telegramBotToken" | "appBaseUrl">): Bot {
  const bot = new Bot(config.telegramBotToken);

  bot.command("start", async (context) => {
    await context.reply(
      [
        "Привет! Это бот клуба настольных игр.",
        "Базовый runtime уже запущен.",
        `Расширенный функционал будет добавлен в следующих задачах. Веб-версия: ${config.appBaseUrl}`
      ].join("\n")
    );
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

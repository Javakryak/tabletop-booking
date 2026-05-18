import { Bot } from "grammy";

import type { BotEnvConfig } from "../config/env.js";
import {
  createAdminBookingsFetcher,
  handleAdminCommand,
  handlePendingCommand,
  handleTodayCommand
} from "./admin-commands.js";
import { linkTelegramUser } from "./link-telegram-user.js";
import { handleStartCommand } from "./start-command.js";
import {
  handleBookCommand,
  handleCancelCommand,
  handleFindGameCommand,
  handleHelpCommand,
  handleMyBookingsCommand,
  handleMyMeetupsCommand,
  handleSettingsCommand
} from "./user-commands.js";

export function createBot(
  config: Pick<
    BotEnvConfig,
    | "adminApiToken"
    | "adminTelegramIds"
    | "telegramBotToken"
    | "appBaseUrl"
    | "apiBaseUrl"
    | "scheduleTimezone"
  >
): Bot {
  const bot = new Bot(config.telegramBotToken);
  const adminBookingsUrl = `${config.appBaseUrl}/admin/bookings`;
  const fetchAdminBookings = config.adminApiToken
    ? createAdminBookingsFetcher({
        adminApiToken: config.adminApiToken,
        apiBaseUrl: config.apiBaseUrl
      })
    : async () => {
        throw new Error("BOT_ADMIN_API_TOKEN is not configured");
      };

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
    await handleHelpCommand(context, { appBaseUrl: config.appBaseUrl });
  });

  bot.command("book", async (context) => {
    await handleBookCommand(context, { appBaseUrl: config.appBaseUrl });
  });

  bot.command("my_bookings", async (context) => {
    await handleMyBookingsCommand(context, { appBaseUrl: config.appBaseUrl });
  });

  bot.command("my_meetups", async (context) => {
    await handleMyMeetupsCommand(context, { appBaseUrl: config.appBaseUrl });
  });

  bot.command("find_game", async (context) => {
    await handleFindGameCommand(context, { appBaseUrl: config.appBaseUrl });
  });

  bot.command("cancel", async (context) => {
    await handleCancelCommand(context, { appBaseUrl: config.appBaseUrl });
  });

  bot.command("settings", async (context) => {
    await handleSettingsCommand(context, { appBaseUrl: config.appBaseUrl });
  });

  bot.command("admin", async (context) => {
    await handleAdminCommand(context, {
      adminBookingsUrl,
      adminTelegramIds: config.adminTelegramIds,
      appBaseUrl: config.appBaseUrl,
      fetchAdminBookings,
      timezone: config.scheduleTimezone
    });
  });

  bot.command("pending", async (context) => {
    await handlePendingCommand(context, {
      adminBookingsUrl,
      adminTelegramIds: config.adminTelegramIds,
      appBaseUrl: config.appBaseUrl,
      fetchAdminBookings,
      timezone: config.scheduleTimezone
    });
  });

  bot.command("today", async (context) => {
    await handleTodayCommand(context, {
      adminBookingsUrl,
      adminTelegramIds: config.adminTelegramIds,
      appBaseUrl: config.appBaseUrl,
      fetchAdminBookings,
      timezone: config.scheduleTimezone
    });
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

import { ADMIN_BOT_COMMANDS } from "./bot/admin-commands.js";
import { createBookingNotificationsClient } from "./bot/booking-notifications-client.js";
import { startBookingNotificationsWorker } from "./bot/booking-notifications-worker.js";
import { createBot } from "./bot/create-bot.js";
import { startTelegramWebhookServer } from "./bot/webhook-server.js";
import { USER_BOT_COMMANDS } from "./bot/user-commands.js";
import { readBotEnv } from "./config/env.js";

async function bootstrap(): Promise<void> {
  const config = readBotEnv();
  const bot = createBot(config);
  await bot.api.setMyCommands([...USER_BOT_COMMANDS, ...ADMIN_BOT_COMMANDS]);

  if (config.updateMode === "polling") {
    startBookingNotificationsWorker({
      appBaseUrl: config.appBaseUrl,
      batchSize: config.notificationBatchSize,
      bot,
      client: createBookingNotificationsClient({
        apiBaseUrl: config.apiBaseUrl,
        botToken: config.telegramBotToken
      }),
      pollIntervalMs: config.notificationPollIntervalMs,
      timezone: config.scheduleTimezone
    });

    await bot.start({
      onStart: () => {
        console.info("Telegram bot started in polling mode.");
      }
    });

    return;
  }

  await bot.api.setWebhook(config.telegramWebhookUrl!, {
    secret_token: config.telegramWebhookSecret!
  });

  const webhookServer = await startTelegramWebhookServer(bot, {
    host: config.telegramWebhookHost!,
    path: config.telegramWebhookPath!,
    port: config.telegramWebhookPort!,
    secretToken: config.telegramWebhookSecret!
  });

  startBookingNotificationsWorker({
    appBaseUrl: config.appBaseUrl,
    batchSize: config.notificationBatchSize,
    bot,
    client: createBookingNotificationsClient({
      apiBaseUrl: config.apiBaseUrl,
      botToken: config.telegramBotToken
    }),
    pollIntervalMs: config.notificationPollIntervalMs,
    timezone: config.scheduleTimezone
  });

  webhookServer.on("close", () => {
    void bot.api.deleteWebhook();
  });

  console.info("Telegram bot started in webhook mode.", {
    webhookHost: config.telegramWebhookHost,
    webhookPath: config.telegramWebhookPath,
    webhookPort: config.telegramWebhookPort
  });
}

bootstrap().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("Telegram bot startup failed", { error: errorMessage });
  process.exitCode = 1;
});

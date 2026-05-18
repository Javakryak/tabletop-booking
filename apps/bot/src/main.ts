import { ADMIN_BOT_COMMANDS } from "./bot/admin-commands.js";
import { createBot } from "./bot/create-bot.js";
import { USER_BOT_COMMANDS } from "./bot/user-commands.js";
import { readBotEnv } from "./config/env.js";

async function bootstrap(): Promise<void> {
  const config = readBotEnv();
  const bot = createBot(config);
  await bot.api.setMyCommands([...USER_BOT_COMMANDS, ...ADMIN_BOT_COMMANDS]);

  if (config.updateMode === "polling") {
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
  console.info("Telegram webhook configured. Webhook server wiring is implemented in TASK-0906.");
}

bootstrap().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("Telegram bot startup failed", { error: errorMessage });
  process.exitCode = 1;
});

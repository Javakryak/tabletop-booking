export type TelegramUpdateMode = "polling" | "webhook";

export interface BotEnvConfig {
  appEnv: string;
  apiBaseUrl: string;
  appBaseUrl: string;
  telegramBotToken: string;
  updateMode: TelegramUpdateMode;
  telegramWebhookUrl?: string;
  telegramWebhookSecret?: string;
}

const SUPPORTED_UPDATE_MODES = new Set<TelegramUpdateMode>(["polling", "webhook"]);

function readRequiredEnv(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key]?.trim();

  if (!value) {
    throw new Error(`Environment variable ${key} is required.`);
  }

  return value;
}

function readOptionalEnv(source: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = source[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function readBotEnv(source: NodeJS.ProcessEnv = process.env): BotEnvConfig {
  const updateModeRaw = source.TELEGRAM_UPDATE_MODE?.trim() ?? "polling";

  if (!SUPPORTED_UPDATE_MODES.has(updateModeRaw as TelegramUpdateMode)) {
    throw new Error("TELEGRAM_UPDATE_MODE must be either 'polling' or 'webhook'.");
  }

  const config: BotEnvConfig = {
    appEnv: source.APP_ENV?.trim() ?? "local",
    apiBaseUrl: source.API_BASE_URL?.trim() ?? "http://localhost:3001/api/v1",
    appBaseUrl: source.APP_BASE_URL?.trim() ?? "http://localhost:3000",
    telegramBotToken: readRequiredEnv(source, "TELEGRAM_BOT_TOKEN"),
    updateMode: updateModeRaw as TelegramUpdateMode
  };

  const webhookUrl = readOptionalEnv(source, "TELEGRAM_WEBHOOK_URL");
  const webhookSecret = readOptionalEnv(source, "TELEGRAM_WEBHOOK_SECRET");

  if (webhookUrl) {
    config.telegramWebhookUrl = webhookUrl;
  }

  if (webhookSecret) {
    config.telegramWebhookSecret = webhookSecret;
  }

  if (config.updateMode === "webhook") {
    config.telegramWebhookUrl = readRequiredEnv(source, "TELEGRAM_WEBHOOK_URL");
    config.telegramWebhookSecret = readRequiredEnv(source, "TELEGRAM_WEBHOOK_SECRET");
  }

  return config;
}

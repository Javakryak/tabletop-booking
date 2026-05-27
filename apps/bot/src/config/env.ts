export type TelegramUpdateMode = "polling" | "webhook";

export interface BotEnvConfig {
  adminApiToken?: string;
  adminTelegramIds: ReadonlySet<string>;
  appEnv: string;
  apiBaseUrl: string;
  appBaseUrl: string;
  notificationBatchSize: number;
  notificationPollIntervalMs: number;
  scheduleTimezone: string;
  telegramBotToken: string;
  updateMode: TelegramUpdateMode;
  telegramWebhookUrl?: string;
  telegramWebhookSecret?: string;
  telegramWebhookHost?: string;
  telegramWebhookPort?: number;
  telegramWebhookPath?: string;
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

function normalizeWebhookPath(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return "/telegram/webhook";
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function parseCommaSeparatedSet(value: string | undefined): ReadonlySet<string> {
  if (!value) {
    return new Set<string>();
  }

  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return new Set(parsed);
}

function readPositiveInteger(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  options?: { max?: number; min?: number }
): number {
  const raw = source[key]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  const min = options?.min ?? 1;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
}

export function readBotEnv(source: NodeJS.ProcessEnv = process.env): BotEnvConfig {
  const updateModeRaw = source.TELEGRAM_UPDATE_MODE?.trim() ?? "polling";

  if (!SUPPORTED_UPDATE_MODES.has(updateModeRaw as TelegramUpdateMode)) {
    throw new Error("TELEGRAM_UPDATE_MODE must be either 'polling' or 'webhook'.");
  }

  const config: BotEnvConfig = {
    adminTelegramIds: parseCommaSeparatedSet(source.BOT_ADMIN_TELEGRAM_IDS),
    appEnv: source.APP_ENV?.trim() ?? "local",
    apiBaseUrl: source.API_BASE_URL?.trim() ?? "http://localhost:3001/api/v1",
    appBaseUrl: source.APP_BASE_URL?.trim() ?? "http://localhost:3000",
    notificationBatchSize: readPositiveInteger(source, "BOT_NOTIFICATION_BATCH_SIZE", 20, {
      max: 100,
      min: 1
    }),
    notificationPollIntervalMs: readPositiveInteger(
      source,
      "BOT_NOTIFICATION_POLL_INTERVAL_MS",
      30_000,
      {
        max: 300_000,
        min: 5_000
      }
    ),
    scheduleTimezone: source.BOT_SCHEDULE_TIMEZONE?.trim() ?? "Europe/Moscow",
    telegramBotToken: readRequiredEnv(source, "TELEGRAM_BOT_TOKEN"),
    updateMode: updateModeRaw as TelegramUpdateMode
  };

  const adminApiToken = readOptionalEnv(source, "BOT_ADMIN_API_TOKEN");
  if (adminApiToken) {
    config.adminApiToken = adminApiToken;
  }

  const webhookUrl = readOptionalEnv(source, "TELEGRAM_WEBHOOK_URL");
  const webhookSecret = readOptionalEnv(source, "TELEGRAM_WEBHOOK_SECRET");
  const webhookHost = readOptionalEnv(source, "TELEGRAM_WEBHOOK_HOST");
  const webhookPath = readOptionalEnv(source, "TELEGRAM_WEBHOOK_PATH");

  if (webhookUrl) {
    config.telegramWebhookUrl = webhookUrl;
  }

  if (webhookSecret) {
    config.telegramWebhookSecret = webhookSecret;
  }

  if (webhookHost) {
    config.telegramWebhookHost = webhookHost;
  }

  if (webhookPath) {
    config.telegramWebhookPath = normalizeWebhookPath(webhookPath);
  }

  const webhookPort = readPositiveInteger(source, "TELEGRAM_WEBHOOK_PORT", 8081, {
    min: 1,
    max: 65535
  });

  if (source.TELEGRAM_WEBHOOK_PORT?.trim()) {
    config.telegramWebhookPort = webhookPort;
  }

  if (config.updateMode === "webhook") {
    config.telegramWebhookUrl = readRequiredEnv(source, "TELEGRAM_WEBHOOK_URL");
    config.telegramWebhookSecret = readRequiredEnv(source, "TELEGRAM_WEBHOOK_SECRET");
    config.telegramWebhookHost = webhookHost ?? "0.0.0.0";
    config.telegramWebhookPort = webhookPort;

    let webhookUrlParsed: URL;
    try {
      webhookUrlParsed = new URL(config.telegramWebhookUrl);
    } catch {
      throw new Error("TELEGRAM_WEBHOOK_URL must be a valid absolute URL.");
    }

    const pathFromUrl = normalizeWebhookPath(webhookUrlParsed.pathname);
    const configuredPath = config.telegramWebhookPath ?? pathFromUrl;

    if (config.telegramWebhookPath && config.telegramWebhookPath !== pathFromUrl) {
      throw new Error(
        "TELEGRAM_WEBHOOK_PATH must match TELEGRAM_WEBHOOK_URL pathname in webhook mode."
      );
    }

    config.telegramWebhookPath = configuredPath;
  }

  return config;
}

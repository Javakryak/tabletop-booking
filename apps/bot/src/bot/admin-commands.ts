import { InlineKeyboard, type CommandContext, type Context } from "grammy";

type BotCommandDefinition = {
  command: string;
  description: string;
};

type AdminBookingQueueItem = {
  endAt: string;
  id: string;
  room?: {
    name?: string;
  };
  startAt: string;
  status: string;
  table?: {
    number?: string;
  };
};

type AdminBookingsResponse = {
  data?: AdminBookingQueueItem[];
};

type AdminCommandDependencies = {
  adminBookingsUrl: string;
  adminTelegramIds: ReadonlySet<string>;
  appBaseUrl: string;
  fetchAdminBookings: (query?: { status?: string }) => Promise<AdminBookingQueueItem[]>;
  now?: () => Date;
  timezone: string;
};

type BotCommandContext = CommandContext<Context>;

export const ADMIN_BOT_COMMANDS: BotCommandDefinition[] = [
  { command: "admin", description: "Панель администратора" },
  { command: "pending", description: "Заявки в ожидании подтверждения" },
  { command: "today", description: "Брони на сегодня" }
];

export async function handleAdminCommand(
  context: BotCommandContext,
  dependencies: AdminCommandDependencies
): Promise<void> {
  if (!(await assertAdminAccess(context, dependencies.adminTelegramIds))) {
    return;
  }

  const now = dependencies.now ? dependencies.now() : new Date();

  try {
    const bookings = await dependencies.fetchAdminBookings();
    const pendingCount = bookings.filter((booking) => normalizeStatus(booking.status) === "pending").length;
    const todayCount = filterBookingsForDate(bookings, now, dependencies.timezone).length;

    await context.reply(
      [
        "Оперативная сводка:",
        `Заявки pending: ${pendingCount}`,
        `Брони на сегодня: ${todayCount}`,
        "Для действий используйте кнопки ниже."
      ].join("\n"),
      {
        reply_markup: buildAdminKeyboard(dependencies.appBaseUrl, dependencies.adminBookingsUrl)
      }
    );
    return;
  } catch {
    await context.reply("Не удалось загрузить админ-сводку. Откройте очередь в веб-панели.", {
      reply_markup: buildAdminKeyboard(dependencies.appBaseUrl, dependencies.adminBookingsUrl)
    });
  }
}

export async function handlePendingCommand(
  context: BotCommandContext,
  dependencies: AdminCommandDependencies
): Promise<void> {
  if (!(await assertAdminAccess(context, dependencies.adminTelegramIds))) {
    return;
  }

  try {
    const pendingBookings = await dependencies.fetchAdminBookings({ status: "pending" });
    const preview = formatPendingPreview(pendingBookings, dependencies.timezone);

    await context.reply(preview, {
      reply_markup: new InlineKeyboard()
        .url("Открыть очередь заявок", dependencies.adminBookingsUrl)
        .text("Обновить", "/pending")
    });
    return;
  } catch {
    await context.reply("Не удалось получить pending-заявки. Откройте очередь в веб-панели.", {
      reply_markup: new InlineKeyboard().url("Открыть очередь заявок", dependencies.adminBookingsUrl)
    });
  }
}

export async function handleTodayCommand(
  context: BotCommandContext,
  dependencies: AdminCommandDependencies
): Promise<void> {
  if (!(await assertAdminAccess(context, dependencies.adminTelegramIds))) {
    return;
  }

  const now = dependencies.now ? dependencies.now() : new Date();

  try {
    const bookings = await dependencies.fetchAdminBookings();
    const todayBookings = filterBookingsForDate(bookings, now, dependencies.timezone);
    const preview = formatTodayPreview(todayBookings, dependencies.timezone);

    await context.reply(preview, {
      reply_markup: new InlineKeyboard()
        .url("Открыть админ-панель", dependencies.adminBookingsUrl)
        .text("Обновить", "/today")
    });
    return;
  } catch {
    await context.reply("Не удалось получить брони на сегодня. Откройте админ-панель в вебе.", {
      reply_markup: new InlineKeyboard().url("Открыть админ-панель", dependencies.adminBookingsUrl)
    });
  }
}

export function createAdminBookingsFetcher(
  config: {
    adminApiToken: string;
    apiBaseUrl: string;
  },
  fetchImpl: typeof fetch = fetch
): (query?: { status?: string }) => Promise<AdminBookingQueueItem[]> {
  return async (query) => {
    const url = new URL(`${config.apiBaseUrl}/admin/bookings`);
    if (query?.status) {
      url.searchParams.set("status", query.status);
    }

    const response = await fetchImpl(url.toString(), {
      headers: new Headers({
        authorization: `Bearer ${config.adminApiToken}`
      }),
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`Admin bookings API request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as AdminBookingsResponse;
    if (!Array.isArray(payload.data)) {
      throw new Error("Admin bookings API response does not contain data array");
    }

    return payload.data.filter((item) => Boolean(item?.id && item?.startAt && item?.endAt));
  };
}

async function assertAdminAccess(
  context: BotCommandContext,
  adminTelegramIds: ReadonlySet<string>
): Promise<boolean> {
  const telegramUser = context.from;
  if (!telegramUser) {
    await context.reply("Не удалось определить пользователя Telegram. Попробуйте ещё раз.");
    return false;
  }

  const hasAccess = adminTelegramIds.has(String(telegramUser.id));
  if (!hasAccess) {
    await context.reply("Команда доступна только администраторам и владельцу клуба.");
    return false;
  }

  return true;
}

function buildAdminKeyboard(appBaseUrl: string, adminBookingsUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .url("Очередь заявок", adminBookingsUrl)
    .url("Админ-панель", `${appBaseUrl}/admin`);
}

function formatPendingPreview(bookings: AdminBookingQueueItem[], timezone: string): string {
  if (bookings.length === 0) {
    return "Сейчас нет заявок со статусом pending.";
  }

  const sorted = [...bookings].sort(
    (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt)
  );
  const lines = sorted.slice(0, 5).map((booking, index) => {
    const startText = formatDateTime(booking.startAt, timezone);
    const endText = formatTimeOnly(booking.endAt, timezone);
    const roomName = booking.room?.name ? ` • ${booking.room.name}` : "";
    const tableNumber = booking.table?.number ? ` • стол ${booking.table.number}` : "";

    return `${index + 1}. ${startText}–${endText}${roomName}${tableNumber}`;
  });

  if (sorted.length > lines.length) {
    lines.push(`Показаны первые ${lines.length} из ${sorted.length}.`);
  }

  return ["Pending-заявки:", ...lines].join("\n");
}

function formatTodayPreview(bookings: AdminBookingQueueItem[], timezone: string): string {
  if (bookings.length === 0) {
    return "На сегодня активных броней не найдено.";
  }

  const sorted = [...bookings].sort(
    (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt)
  );
  const lines = sorted.slice(0, 8).map((booking, index) => {
    const startText = formatTimeOnly(booking.startAt, timezone);
    const endText = formatTimeOnly(booking.endAt, timezone);
    const status = normalizeStatus(booking.status);
    const roomName = booking.room?.name ? ` • ${booking.room.name}` : "";
    const tableNumber = booking.table?.number ? ` • стол ${booking.table.number}` : "";

    return `${index + 1}. ${startText}–${endText} • ${status}${roomName}${tableNumber}`;
  });

  if (sorted.length > lines.length) {
    lines.push(`Показаны первые ${lines.length} из ${sorted.length}.`);
  }

  return ["Брони на сегодня:", ...lines].join("\n");
}

function filterBookingsForDate(
  bookings: AdminBookingQueueItem[],
  date: Date,
  timezone: string
): AdminBookingQueueItem[] {
  const todayKey = toDateKey(date, timezone);
  return bookings.filter((booking) => toDateKey(new Date(booking.startAt), timezone) === todayKey);
}

function formatDateTime(input: string, timezone: string): string {
  const date = new Date(input);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone
  }).format(date);
}

function formatTimeOnly(input: string, timezone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone
  }).format(new Date(input));
}

function toDateKey(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

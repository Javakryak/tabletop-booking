import { InlineKeyboard, type CommandContext, type Context } from "grammy";

type BotCommandDefinition = {
  command: string;
  description: string;
};

export const USER_BOT_COMMANDS: BotCommandDefinition[] = [
  { command: "start", description: "Запуск и привязка аккаунта" },
  { command: "help", description: "Список доступных команд" },
  { command: "book", description: "Открыть бронирование столов" },
  { command: "my_bookings", description: "Мои бронирования" },
  { command: "my_meetups", description: "Мои встречи" },
  { command: "find_game", description: "Подобрать игру" },
  { command: "cancel", description: "Как отменить бронь" },
  { command: "settings", description: "Настройки профиля" }
];

type UserCommandDependencies = {
  appBaseUrl: string;
};

type BotCommandContext = CommandContext<Context>;

export async function handleHelpCommand(
  context: BotCommandContext,
  dependencies: UserCommandDependencies
): Promise<void> {
  await context.reply(
    [
      "Доступные команды:",
      "/book — открыть страницу бронирования",
      "/my_bookings — посмотреть свои бронирования",
      "/my_meetups — перейти к встречам",
      "/find_game — открыть каталог игр",
      "/cancel — как отменить бронь",
      "/settings — настройки профиля"
    ].join("\n"),
    {
      reply_markup: new InlineKeyboard().url("Открыть приложение клуба", dependencies.appBaseUrl)
    }
  );
}

export async function handleBookCommand(
  context: BotCommandContext,
  dependencies: UserCommandDependencies
): Promise<void> {
  await context.reply("Быстрое бронирование доступно в приложении клуба.", {
    reply_markup: new InlineKeyboard().url(
      "Открыть расписание",
      `${dependencies.appBaseUrl}/schedule`
    )
  });
}

export async function handleMyBookingsCommand(
  context: BotCommandContext,
  dependencies: UserCommandDependencies
): Promise<void> {
  await context.reply("Ваши бронирования и их статусы доступны в личном кабинете.", {
    reply_markup: new InlineKeyboard().url("Мои бронирования", `${dependencies.appBaseUrl}/dashboard`)
  });
}

export async function handleMyMeetupsCommand(
  context: BotCommandContext,
  dependencies: UserCommandDependencies
): Promise<void> {
  await context.reply(
    "Управление встречами пока доступно через веб-интерфейс. Мы расширим команды бота в следующих задачах.",
    {
      reply_markup: new InlineKeyboard().url(
        "Открыть личный кабинет",
        `${dependencies.appBaseUrl}/dashboard`
      )
    }
  );
}

export async function handleFindGameCommand(
  context: BotCommandContext,
  dependencies: UserCommandDependencies
): Promise<void> {
  await context.reply("Подбор игр доступен в каталоге клуба.", {
    reply_markup: new InlineKeyboard().url("Каталог игр", `${dependencies.appBaseUrl}/games`)
  });
}

export async function handleCancelCommand(
  context: BotCommandContext,
  dependencies: UserCommandDependencies
): Promise<void> {
  await context.reply(
    "Отмена брони доступна в личном кабинете. Если кнопка отмены недоступна, значит уже действует правило клуба по времени.",
    {
      reply_markup: new InlineKeyboard().url("Открыть мои брони", `${dependencies.appBaseUrl}/dashboard`)
    }
  );
}

export async function handleSettingsCommand(
  context: BotCommandContext,
  dependencies: UserCommandDependencies
): Promise<void> {
  await context.reply("Настройки профиля и контактов доступны в личном кабинете.", {
    reply_markup: new InlineKeyboard().url("Открыть настройки", `${dependencies.appBaseUrl}/dashboard`)
  });
}

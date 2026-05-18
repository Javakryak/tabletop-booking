import { InlineKeyboard, type CommandContext, type Context } from "grammy";

import type { LinkTelegramUserInput, LinkTelegramUserResult } from "./link-telegram-user.js";

export type StartCommandDependencies = {
  appBaseUrl: string;
  linkTelegramUser: (input: LinkTelegramUserInput) => Promise<LinkTelegramUserResult>;
};

export async function handleStartCommand(
  context: CommandContext<Context>,
  dependencies: StartCommandDependencies
): Promise<void> {
  const user = context.from;
  if (!user) {
    await context.reply("Не удалось определить пользователя Telegram. Попробуйте ещё раз.");
    return;
  }

  const displayName = buildDisplayName(user.first_name, user.last_name, user.username);

  const linkResult = await dependencies.linkTelegramUser({
    displayName,
    telegramId: String(user.id),
    telegramUsername: user.username ?? null
  });

  await context.reply(buildStartText(linkResult), {
    reply_markup: new InlineKeyboard().url("Открыть приложение клуба", dependencies.appBaseUrl)
  });
}

function buildStartText(linkResult: LinkTelegramUserResult): string {
  const lines = ["Привет! Добро пожаловать в бот клуба настольных игр."];

  if (linkResult.isNewUser) {
    lines.push("Мы создали для вас новый аккаунт и привязали его к Telegram.");
  } else {
    lines.push("Ваш Telegram уже привязан к аккаунту клуба.");
  }

  if (!linkResult.profileCompleted) {
    lines.push("Заполните профиль в приложении, чтобы можно было создавать реальные брони.");
  }

  lines.push("Нажмите кнопку ниже, чтобы открыть сайт клуба.");
  return lines.join("\n");
}

function buildDisplayName(
  firstName: string | undefined,
  lastName: string | undefined,
  username: string | undefined
): string {
  const fullName = [firstName, lastName].filter((part) => Boolean(part && part.trim())).join(" ");
  if (fullName) {
    return fullName;
  }

  if (username) {
    return username;
  }

  return "Игрок клуба";
}

export type LinkTelegramUserInput = {
  displayName: string;
  telegramId: string;
  telegramUsername: string | null;
};

export type LinkTelegramUserResult = {
  isNewUser: boolean;
  profileCompleted: boolean;
  userId: string;
};

export async function linkTelegramUser(
  config: {
    apiBaseUrl: string;
    botToken: string;
  },
  input: LinkTelegramUserInput,
  fetchImpl: typeof fetch = fetch
): Promise<LinkTelegramUserResult> {
  const response = await fetchImpl(`${config.apiBaseUrl}/auth/telegram-bot/link`, {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      "x-telegram-bot-token": config.botToken
    }),
    body: JSON.stringify({
      displayName: input.displayName,
      telegramId: input.telegramId,
      telegramUsername: input.telegramUsername
    })
  });

  if (!response.ok) {
    throw new Error(`Bot link API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      isNewUser?: boolean;
      profileCompleted?: boolean;
      userId?: string;
    };
  };

  if (!payload.data?.userId) {
    throw new Error("Bot link API response does not contain userId");
  }

  return {
    isNewUser: Boolean(payload.data.isNewUser),
    profileCompleted: Boolean(payload.data.profileCompleted),
    userId: payload.data.userId
  };
}

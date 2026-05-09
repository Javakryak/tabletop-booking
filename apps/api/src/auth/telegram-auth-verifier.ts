import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { TelegramAuthDataDto } from "./dto/telegram-auth.dto.js";

export type VerifiedTelegramIdentity = {
  authDate: number;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  telegramId: string;
  telegramUsername: string | null;
};

const DEFAULT_MAX_AGE_SECONDS = 86400;

export function verifyTelegramLoginData(
  telegramAuthData: TelegramAuthDataDto,
  botToken: string,
  nowUnixSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS
): VerifiedTelegramIdentity | null {
  const authDate = Number.parseInt(telegramAuthData.auth_date, 10);
  if (!Number.isFinite(authDate)) {
    return null;
  }

  const dataEntries = Object.entries(telegramAuthData)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as const);
  const dataCheckString = dataEntries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!isSameHexDigest(calculatedHash, telegramAuthData.hash)) {
    return null;
  }

  if (nowUnixSeconds - authDate > maxAgeSeconds || authDate > nowUnixSeconds + 60) {
    return null;
  }

  return {
    authDate,
    firstName: telegramAuthData.first_name,
    lastName: telegramAuthData.last_name ?? null,
    photoUrl: telegramAuthData.photo_url ?? null,
    telegramId: telegramAuthData.id,
    telegramUsername: telegramAuthData.username ?? null
  };
}

export function verifyTelegramMiniAppInitData(
  initData: string,
  botToken: string,
  nowUnixSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS
): VerifiedTelegramIdentity | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDateString = params.get("auth_date");
  const userPayload = params.get("user");

  if (!hash || !authDateString || !userPayload) {
    return null;
  }

  const authDate = Number.parseInt(authDateString, 10);
  if (!Number.isFinite(authDate)) {
    return null;
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!isSameHexDigest(calculatedHash, hash)) {
    return null;
  }

  if (nowUnixSeconds - authDate > maxAgeSeconds || authDate > nowUnixSeconds + 60) {
    return null;
  }

  let parsedUser: Record<string, unknown>;
  try {
    parsedUser = JSON.parse(userPayload) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (typeof parsedUser.id !== "number" && typeof parsedUser.id !== "string") {
    return null;
  }

  if (typeof parsedUser.first_name !== "string" || parsedUser.first_name.length === 0) {
    return null;
  }

  return {
    authDate,
    firstName: parsedUser.first_name,
    lastName: typeof parsedUser.last_name === "string" ? parsedUser.last_name : null,
    photoUrl: typeof parsedUser.photo_url === "string" ? parsedUser.photo_url : null,
    telegramId: String(parsedUser.id),
    telegramUsername: typeof parsedUser.username === "string" ? parsedUser.username : null
  };
}

function isSameHexDigest(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }

  if (left.length % 2 !== 0 || right.length % 2 !== 0) {
    return false;
  }

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

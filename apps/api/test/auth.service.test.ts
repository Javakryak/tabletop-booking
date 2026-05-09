import { UnauthorizedException } from "@nestjs/common";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";
import jwt from "jsonwebtoken";

import { AuthService } from "../src/auth/auth.service.js";

const BOT_TOKEN = "test-bot-token";
const JWT_SECRET = "test-jwt-secret";

type StoredUser = {
  consentsCount: number;
  id: string;
  phone: string | null;
  roles: Array<"user" | "admin" | "owner">;
  telegramId: string | null;
  telegramUsername: string | null;
  userProfileDisplayName: string;
};

test("authenticateTelegramWeb creates user and reuses it on repeated login", async () => {
  const repository = createInMemoryRepository();
  const authService = new AuthService(createConfigService() as never, repository as never);
  const now = Math.floor(Date.now() / 1000);

  const firstPayload = signTelegramLoginPayload(
    {
      auth_date: String(now),
      first_name: "Ivan",
      id: "123456",
      username: "ivan_user"
    },
    BOT_TOKEN
  );
  const firstResult = await authService.authenticateTelegramWeb(firstPayload as never);

  assert.equal(repository.createCalls, 1);
  assert.equal(firstResult.data.user.id, "user-1");
  assert.deepEqual(firstResult.data.user.roles, ["user"]);
  assert.equal(firstResult.data.user.profileCompleted, false);
  assert.equal(firstResult.data.user.consentRequired, true);

  const secondPayload = signTelegramLoginPayload(
    {
      auth_date: String(now),
      first_name: "Ivan",
      id: "123456",
      username: "ivan_new"
    },
    BOT_TOKEN
  );
  const secondResult = await authService.authenticateTelegramWeb(secondPayload as never);

  assert.equal(repository.createCalls, 1);
  assert.equal(repository.updateCalls, 1);
  assert.equal(secondResult.data.user.id, "user-1");

  const decoded = jwt.verify(secondResult.data.accessToken, JWT_SECRET) as {
    roles: string[];
    sub: string;
    telegramId: string;
  };
  assert.equal(decoded.sub, "user-1");
  assert.equal(decoded.telegramId, "123456");
  assert.deepEqual(decoded.roles, ["user"]);
});

test("authenticateTelegramWeb rejects invalid signature", async () => {
  const repository = createInMemoryRepository();
  const authService = new AuthService(createConfigService() as never, repository as never);
  const now = Math.floor(Date.now() / 1000);

  const payload = signTelegramLoginPayload(
    {
      auth_date: String(now),
      first_name: "Ivan",
      id: "123456"
    },
    BOT_TOKEN
  );
  payload.hash = "0".repeat(64);

  await assert.rejects(
    () => authService.authenticateTelegramWeb(payload as never),
    UnauthorizedException
  );
});

function createConfigService() {
  return {
    get(key: string): string | undefined {
      if (key === "TELEGRAM_BOT_TOKEN") {
        return BOT_TOKEN;
      }

      if (key === "JWT_SECRET") {
        return JWT_SECRET;
      }

      if (key === "JWT_EXPIRES_IN") {
        return "1h";
      }

      return undefined;
    }
  };
}

function createInMemoryRepository() {
  let storedUser: StoredUser | null = null;
  let createCalls = 0;
  let updateCalls = 0;

  return {
    get createCalls() {
      return createCalls;
    },
    get updateCalls() {
      return updateCalls;
    },

    async findByTelegramId(telegramId: string): Promise<StoredUser | null> {
      if (storedUser?.telegramId === telegramId) {
        return { ...storedUser };
      }

      return null;
    },

    async createUserFromTelegramIdentity(identity: {
      firstName: string;
      telegramId: string;
      telegramUsername: string | null;
    }): Promise<StoredUser> {
      createCalls += 1;
      storedUser = {
        consentsCount: 0,
        id: "user-1",
        phone: null,
        roles: ["user"],
        telegramId: identity.telegramId,
        telegramUsername: identity.telegramUsername,
        userProfileDisplayName: identity.firstName
      };

      return { ...storedUser };
    },

    async updateTelegramMetadata(userId: string, telegramUsername: string | null): Promise<void> {
      updateCalls += 1;
      if (storedUser?.id === userId) {
        storedUser = {
          ...storedUser,
          telegramUsername
        };
      }
    }
  };
}

function signTelegramLoginPayload(
  input: Record<string, string>,
  botToken: string
): Record<string, string> {
  const dataCheckString = Object.entries(input)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  return {
    ...input,
    hash
  };
}

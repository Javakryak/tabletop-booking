import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { MeService } from "../src/me/me.service.js";

type MeRecord = {
  deletionRequestedAt: Date | null;
  displayName: string;
  email: string | null;
  id: string;
  phone: string | null;
  showPhoneToAdmins: boolean;
  showTelegramUsernameToMeetupParticipants: boolean;
  status: "active" | "blocked" | "deleted";
  telegramUsername: string | null;
};

test("getMe returns authenticated user's own profile payload", async () => {
  const repository = createInMemoryRepository();
  const service = new MeService(repository as never);

  const result = await service.getMe("user-1");

  assert.equal(result.data.id, "user-1");
  assert.equal(result.data.displayName, "Ivan");
  assert.equal(result.data.phone, "+79990000000");
  assert.equal(result.data.email, "ivan@example.com");
  assert.deepEqual(result.data.privacy, {
    showPhoneToAdmins: false,
    showTelegramUsernameToMeetupParticipants: true
  });
});

test("updateProfile updates displayName, phone and email", async () => {
  const repository = createInMemoryRepository();
  const service = new MeService(repository as never);

  const result = await service.updateProfile("user-1", {
    displayName: "Ivan Updated",
    email: "updated@example.com",
    phone: "+79990000001"
  });

  assert.equal(result.data.displayName, "Ivan Updated");
  assert.equal(result.data.phone, "+79990000001");
  assert.equal(result.data.email, "updated@example.com");
});

test("updatePrivacy updates privacy settings", async () => {
  const repository = createInMemoryRepository();
  const service = new MeService(repository as never);

  const result = await service.updatePrivacy("user-1", {
    showPhoneToAdmins: true,
    showTelegramUsernameToMeetupParticipants: false
  });

  assert.deepEqual(result.data.privacy, {
    showPhoneToAdmins: true,
    showTelegramUsernameToMeetupParticipants: false
  });
});

test("updateProfile rejects empty body", async () => {
  const repository = createInMemoryRepository();
  const service = new MeService(repository as never);

  await assert.rejects(() => service.updateProfile("user-1", {}), BadRequestException);
});

test("updatePrivacy rejects empty body", async () => {
  const repository = createInMemoryRepository();
  const service = new MeService(repository as never);

  await assert.rejects(() => service.updatePrivacy("user-1", {}), BadRequestException);
});

test("getMe rejects blocked users", async () => {
  const repository = createInMemoryRepository("blocked");
  const service = new MeService(repository as never);

  await assert.rejects(() => service.getMe("user-1"), ForbiddenException);
});

test("updateProfile rejects blocked users before mutation", async () => {
  const repository = createInMemoryRepository("blocked");
  const service = new MeService(repository as never);

  await assert.rejects(
    () =>
      service.updateProfile("user-1", {
        displayName: "Blocked Update"
      }),
    ForbiddenException
  );
});

test("updatePrivacy rejects blocked users before mutation", async () => {
  const repository = createInMemoryRepository("blocked");
  const service = new MeService(repository as never);

  await assert.rejects(
    () =>
      service.updatePrivacy("user-1", {
        showPhoneToAdmins: true
      }),
    ForbiddenException
  );
});

test("getMe rejects missing users", async () => {
  const repository = createInMemoryRepository("active", true);
  const service = new MeService(repository as never);

  await assert.rejects(() => service.getMe("user-404"), NotFoundException);
});

test("requestAccountDeletion marks account as pending deletion", async () => {
  const repository = createInMemoryRepository();
  const service = new MeService(repository as never);

  const result = await service.requestAccountDeletion("user-1", "Need account removal");

  assert.equal(result.data.status, "received");
  const stored = await repository.findProfileByUserId("user-1");
  assert.ok(stored?.deletionRequestedAt);
});

test("requestAccountDeletion is idempotent for existing request", async () => {
  const repository = createInMemoryRepository();
  const service = new MeService(repository as never);

  await service.requestAccountDeletion("user-1", "first");
  const first = await repository.findProfileByUserId("user-1");
  const firstTimestamp = first?.deletionRequestedAt?.toISOString();

  await service.requestAccountDeletion("user-1", "second");
  const second = await repository.findProfileByUserId("user-1");

  assert.equal(second?.deletionRequestedAt?.toISOString(), firstTimestamp);
});

test("requestAccountDeletion rejects blocked users", async () => {
  const repository = createInMemoryRepository("blocked");
  const service = new MeService(repository as never);

  await assert.rejects(
    () => service.requestAccountDeletion("user-1", "remove me"),
    ForbiddenException
  );
});

function createInMemoryRepository(
  status: "active" | "blocked" | "deleted" = "active",
  forceMissing = false
) {
  let stored: MeRecord | null = forceMissing
    ? null
    : {
        deletionRequestedAt: null,
        displayName: "Ivan",
        email: "ivan@example.com",
        id: "user-1",
        phone: "+79990000000",
        showPhoneToAdmins: false,
        showTelegramUsernameToMeetupParticipants: true,
        status,
        telegramUsername: "ivan_user"
      };

  return {
    async findProfileByUserId(userId: string): Promise<MeRecord | null> {
      if (!stored || stored.id !== userId) {
        return null;
      }

      return { ...stored };
    },

    async updateProfile(
      userId: string,
      input: {
        displayName?: string;
        email?: string | null;
        phone?: string | null;
      }
    ): Promise<MeRecord | null> {
      if (!stored || stored.id !== userId) {
        return null;
      }

      stored = {
        ...stored,
        displayName: input.displayName ?? stored.displayName,
        email: input.email !== undefined ? input.email : stored.email,
        phone: input.phone !== undefined ? input.phone : stored.phone
      };
      return { ...stored };
    },

    async updatePrivacy(
      userId: string,
      input: {
        showPhoneToAdmins?: boolean;
        showTelegramUsernameToMeetupParticipants?: boolean;
      }
    ): Promise<MeRecord | null> {
      if (!stored || stored.id !== userId) {
        return null;
      }

      stored = {
        ...stored,
        showPhoneToAdmins: input.showPhoneToAdmins ?? stored.showPhoneToAdmins,
        showTelegramUsernameToMeetupParticipants:
          input.showTelegramUsernameToMeetupParticipants ??
          stored.showTelegramUsernameToMeetupParticipants
      };
      return { ...stored };
    },

    async requestDeletion(
      userId: string,
      _reason: string | null,
      requestedAt: Date
    ): Promise<void> {
      if (!stored || stored.id !== userId) {
        return;
      }

      stored = {
        ...stored,
        deletionRequestedAt: requestedAt
      };
    }
  };
}

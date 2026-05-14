import assert from "node:assert/strict";
import { test } from "node:test";
import { ConflictException, NotFoundException } from "@nestjs/common";

import { OwnerService } from "../src/owner/owner.service.js";

test("getPendingDeletionRequests returns pending requests for owner/admin visibility", async () => {
  const repository = {
    async listPendingDeletionRequests() {
      return [
        {
          displayName: "Demo User",
          reason: "Please remove my account",
          requestedAt: new Date("2026-05-09T10:00:00.000Z"),
          telegramUsername: "demo-user",
          userId: "user-1"
        }
      ];
    }
  };
  const service = new OwnerService(repository as never);

  const result = await service.getPendingDeletionRequests();

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0]?.userId, "user-1");
  assert.equal(result.data[0]?.displayName, "Demo User");
  assert.equal(result.data[0]?.requestedAt, "2026-05-09T10:00:00.000Z");
});

test("getAuditLogs returns filtered audit events with sensitive metadata redacted", async () => {
  const repository = {
    async listAuditLogs() {
      return [
        {
          action: "user.emergency_phone_reveal",
          actorDisplayName: "Owner",
          actorUserId: "owner-1",
          createdAt: new Date("2026-05-10T18:45:00.000Z"),
          entityId: "user-1",
          entityType: "user",
          id: "audit-1",
          metadata: {
            phone: "+79990000000",
            reason: "Telegram unavailable",
            nested: {
              email: "user@example.com"
            }
          }
        }
      ];
    },
    async listPendingDeletionRequests() {
      return [];
    }
  };
  const service = new OwnerService(repository as never);

  const result = await service.getAuditLogs({
    action: "user.emergency_phone_reveal",
    actorUserId: "owner-1",
    from: "2026-05-10T00:00:00.000Z",
    to: "2026-05-11T00:00:00.000Z"
  });

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0]?.id, "audit-1");
  assert.equal(result.data[0]?.createdAt, "2026-05-10T18:45:00.000Z");
  assert.deepEqual(result.data[0]?.metadata, {
    nested: {
      email: "[REDACTED]"
    },
    phone: "[REDACTED]",
    reason: "Telegram unavailable"
  });
});

test("revealEmergencyContact returns phone and writes audit event without raw phone metadata", async () => {
  const calls: unknown[] = [];
  const repository = {
    async findEmergencyContactUser(userId: string) {
      assert.equal(userId, "user-1");
      return {
        displayName: "Demo User",
        phone: "+79990000000",
        telegramUsername: "demo-user",
        userId
      };
    },
    async listPendingDeletionRequests() {
      return [];
    },
    async writeEmergencyPhoneRevealAudit(input: unknown) {
      calls.push(input);
      return {
        createdAt: new Date("2026-05-10T18:45:00.000Z"),
        id: "audit-1"
      };
    }
  };
  const service = new OwnerService(repository as never);

  const result = await service.revealEmergencyContact({
    actorUserId: "admin-1",
    reason: "Telegram unavailable",
    relatedBookingId: "booking-1",
    targetUserId: "user-1"
  });

  assert.equal(result.data.phone, "+79990000000");
  assert.equal(result.data.auditLogId, "audit-1");
  assert.equal(result.data.revealedAt, "2026-05-10T18:45:00.000Z");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    actorUserId: "admin-1",
    reason: "Telegram unavailable",
    relatedBookingId: "booking-1",
    targetUserId: "user-1"
  });
});

test("revealEmergencyContact rejects missing users and users without phone", async () => {
  const missingUserService = new OwnerService({
    async findEmergencyContactUser() {
      return null;
    },
    async listPendingDeletionRequests() {
      return [];
    }
  } as never);

  await assert.rejects(
    () =>
      missingUserService.revealEmergencyContact({
        actorUserId: "admin-1",
        reason: "Telegram unavailable",
        targetUserId: "missing-user"
      }),
    NotFoundException
  );

  const noPhoneService = new OwnerService({
    async findEmergencyContactUser() {
      return {
        displayName: "Demo User",
        phone: null,
        telegramUsername: null,
        userId: "user-1"
      };
    },
    async listPendingDeletionRequests() {
      return [];
    }
  } as never);

  await assert.rejects(
    () =>
      noPhoneService.revealEmergencyContact({
        actorUserId: "admin-1",
        reason: "Telegram unavailable",
        targetUserId: "user-1"
      }),
    ConflictException
  );
});

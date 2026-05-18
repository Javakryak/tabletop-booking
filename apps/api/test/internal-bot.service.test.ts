import { BookingStatus } from "@prisma/client";
import assert from "node:assert/strict";
import { test } from "node:test";

import { InternalBotService } from "../src/internal-bot/internal-bot.service.js";

test("lists pending notifications and filters already delivered items", async () => {
  const service = new InternalBotService(
    {
      get() {
        return "180";
      }
    } as never,
    createRepositoryMock() as never
  );

  const result = await service.listPendingBookingNotifications(10);
  assert.equal(result.data.length, 2);

  const types = result.data.map((item) => item.notificationType).sort();
  assert.deepEqual(types, ["booking_confirmed_user", "new_booking_request_admin"]);

  for (const item of result.data) {
    assert.match(item.recipientTelegramId, /^[0-9]+$/);
    assert.equal(item.booking.roomName.length > 0, true);
  }
});

test("records delivery attempt in repository", async () => {
  const calls: unknown[] = [];
  const repository = {
    async writeNotificationDeliveryAudit(input: unknown) {
      calls.push(input);
    }
  };

  const service = new InternalBotService(
    {
      get() {
        return "180";
      }
    } as never,
    {
      ...createRepositoryMock(),
      ...repository
    } as never
  );

  await service.recordDeliveryAttempt({
    notificationType: "booking_confirmed_user",
    recipientUserId: "00000000-0000-4000-8000-000000000010",
    requestId: "00000000-0000-4000-8000-000000000001",
    status: "delivered"
  });

  assert.equal(calls.length, 1);
});

function createRepositoryMock() {
  const requestLogs = [
    {
      action: "booking.request_created",
      entityId: "booking-1",
      id: "00000000-0000-4000-8000-000000000001",
      metadata: {
        signal: "admin_booking_follow_up"
      }
    },
    {
      action: "booking.notification_requested",
      entityId: "booking-2",
      id: "00000000-0000-4000-8000-000000000002",
      metadata: {
        signal: "booking_confirmed_user_follow_up",
        targetUserId: "00000000-0000-4000-8000-000000000010"
      }
    },
    {
      action: "booking.notification_requested",
      entityId: "booking-3",
      id: "00000000-0000-4000-8000-000000000003",
      metadata: {
        signal: "booking_cancelled_user_follow_up",
        targetUserId: "00000000-0000-4000-8000-000000000011"
      }
    }
  ];

  return {
    async createReminderRequest() {},
    async hasReminderRequest() {
      return false;
    },
    async listAdminRecipients() {
      return [
        {
          id: "00000000-0000-4000-8000-000000000100",
          telegramId: "123456789"
        }
      ];
    },
    async listBookingsByIds() {
      return [
        {
          endAt: new Date("2026-05-20T11:00:00.000Z"),
          id: "booking-1",
          roomName: "Зал A",
          startAt: new Date("2026-05-20T09:00:00.000Z"),
          status: BookingStatus.pending,
          tableNumber: "3",
          userId: "00000000-0000-4000-8000-000000000020"
        },
        {
          endAt: new Date("2026-05-20T13:00:00.000Z"),
          id: "booking-2",
          roomName: "Зал B",
          startAt: new Date("2026-05-20T12:00:00.000Z"),
          status: BookingStatus.confirmed,
          tableNumber: "5",
          userId: "00000000-0000-4000-8000-000000000010"
        },
        {
          endAt: new Date("2026-05-20T14:00:00.000Z"),
          id: "booking-3",
          roomName: "Зал C",
          startAt: new Date("2026-05-20T13:00:00.000Z"),
          status: BookingStatus.cancelled_by_admin,
          tableNumber: "7",
          userId: "00000000-0000-4000-8000-000000000011"
        }
      ];
    },
    async listConfirmedBookingsDueForReminder() {
      return [];
    },
    async listDeliveredNotificationKeys() {
      return new Set(["00000000-0000-4000-8000-000000000003:00000000-0000-4000-8000-000000000011"]);
    },
    async listNotificationRequestLogs() {
      return requestLogs;
    },
    async listUsersByIds() {
      return [
        {
          id: "00000000-0000-4000-8000-000000000010",
          telegramId: "987654321"
        },
        {
          id: "00000000-0000-4000-8000-000000000011",
          telegramId: "111222333"
        }
      ];
    },
    async writeNotificationDeliveryAudit() {}
  };
}

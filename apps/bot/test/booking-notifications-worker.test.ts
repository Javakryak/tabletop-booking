import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";

import { startBookingNotificationsWorker } from "../src/bot/booking-notifications-worker.js";

test("worker sends pending notifications and reports successful delivery", async () => {
  const sent: Array<{ chatId: string; text: string }> = [];
  const reported: Array<{ notificationType: string; status: string }> = [];

  const worker = startBookingNotificationsWorker({
    appBaseUrl: "http://localhost:3000",
    batchSize: 5,
    bot: {
      api: {
        sendMessage: async (chatId: string, text: string) => {
          sent.push({ chatId, text });
        }
      }
    } as never,
    client: {
      async fetchPending() {
        return [
          {
            booking: {
              endAt: "2026-05-20T11:00:00.000Z",
              id: "booking-1",
              roomName: "Зал A",
              startAt: "2026-05-20T09:00:00.000Z",
              tableNumber: "3"
            },
            notificationType: "booking_confirmed_user" as const,
            recipientTelegramId: "123456789",
            recipientUserId: "00000000-0000-4000-8000-000000000001",
            requestId: "00000000-0000-4000-8000-000000000002"
          }
        ];
      },
      async reportDeliveryAttempt(input) {
        reported.push({
          notificationType: input.notificationType,
          status: input.status
        });
      }
    },
    pollIntervalMs: 1_000,
    timezone: "Europe/Moscow"
  });

  await delay(20);
  worker.stop();

  assert.equal(sent.length, 1);
  assert.match(sent[0]?.text ?? "", /подтверждена/i);
  assert.equal(reported.length, 1);
  assert.equal(reported[0]?.status, "delivered");
});

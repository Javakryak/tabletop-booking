import assert from "node:assert/strict";
import { test } from "node:test";

import { createBookingNotificationsClient } from "../src/bot/booking-notifications-client.js";

test("fetchPending requests internal API with bot token header", async () => {
  const calls: Array<{ init: RequestInit | undefined; input: unknown }> = [];
  const fetchMock = async (input: unknown, init?: RequestInit) => {
    calls.push({ init, input });
    return {
      ok: true,
      async json() {
        return {
          data: [
            {
              booking: {
                endAt: "2026-05-20T11:00:00.000Z",
                id: "booking-1",
                roomName: "Зал A",
                startAt: "2026-05-20T09:00:00.000Z",
                tableNumber: "3"
              },
              notificationType: "booking_confirmed_user",
              recipientTelegramId: "123456789",
              recipientUserId: "00000000-0000-4000-8000-000000000001",
              requestId: "00000000-0000-4000-8000-000000000002"
            }
          ]
        };
      }
    } as Response;
  };

  const client = createBookingNotificationsClient(
    {
      apiBaseUrl: "http://localhost:3001/api/v1",
      botToken: "bot-token"
    },
    fetchMock
  );

  const result = await client.fetchPending(10);
  assert.equal(result.length, 1);
  assert.equal(
    calls[0]?.input,
    "http://localhost:3001/api/v1/internal/bot/booking-notifications/pending?limit=10"
  );
  assert.equal((calls[0]?.init?.headers as Headers).get("x-telegram-bot-token"), "bot-token");
});

test("reportDeliveryAttempt sends payload to internal API", async () => {
  const calls: Array<{ init: RequestInit | undefined; input: unknown }> = [];
  const fetchMock = async (input: unknown, init?: RequestInit) => {
    calls.push({ init, input });
    return {
      ok: true
    } as Response;
  };

  const client = createBookingNotificationsClient(
    {
      apiBaseUrl: "http://localhost:3001/api/v1",
      botToken: "bot-token"
    },
    fetchMock
  );

  await client.reportDeliveryAttempt({
    notificationType: "booking_confirmed_user",
    recipientUserId: "00000000-0000-4000-8000-000000000001",
    requestId: "00000000-0000-4000-8000-000000000002",
    status: "delivered"
  });

  assert.equal(
    calls[0]?.input,
    "http://localhost:3001/api/v1/internal/bot/booking-notification-delivered"
  );
  const body = JSON.parse(String(calls[0]?.init?.body));
  assert.deepEqual(body, {
    data: {
      notificationType: "booking_confirmed_user",
      recipientUserId: "00000000-0000-4000-8000-000000000001",
      requestId: "00000000-0000-4000-8000-000000000002",
      status: "delivered"
    }
  });
});

import { UnauthorizedException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { InternalBotController } from "../src/internal-bot/internal-bot.controller.js";

test("listPendingNotifications requires valid bot token", async () => {
  const controller = new InternalBotController(
    {
      assertBotToken(token: string | undefined) {
        if (token !== "valid-token") {
          throw new UnauthorizedException("Invalid bot token");
        }
      }
    } as never,
    {
      async listPendingBookingNotifications() {
        return { data: [] };
      }
    } as never
  );

  await assert.rejects(
    () =>
      controller.listPendingNotifications("invalid-token", {
        limit: 10
      }),
    UnauthorizedException
  );
});

test("recordNotificationDelivery writes delivery ack via service", async () => {
  const calls: unknown[] = [];
  const controller = new InternalBotController(
    {
      assertBotToken(token: string | undefined) {
        if (token !== "valid-token") {
          throw new UnauthorizedException("Invalid bot token");
        }
      }
    } as never,
    {
      async recordDeliveryAttempt(input: unknown) {
        calls.push(input);
      }
    } as never
  );

  const response = await controller.recordNotificationDelivery("valid-token", {
    data: {
      notificationType: "booking_confirmed_user",
      recipientUserId: "00000000-0000-4000-8000-000000000001",
      requestId: "00000000-0000-4000-8000-000000000002",
      status: "delivered"
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(response.data.status, "received");
});

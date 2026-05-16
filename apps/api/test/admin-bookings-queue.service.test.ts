import { BookingStatus } from "@prisma/client";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BookingsService } from "../src/bookings/bookings.service.js";

test("getAdminBookings returns masked contact data for admin queue", async () => {
  const repository = {
    async listAdminBookings(filters: { status?: BookingStatus }) {
      assert.equal(filters.status, BookingStatus.pending);

      return [
        {
          endAt: new Date("2030-05-15T13:00:00.000Z"),
          id: "booking-1",
          roomId: "room-1",
          roomName: "Большой зал",
          startAt: new Date("2030-05-15T12:00:00.000Z"),
          status: BookingStatus.pending,
          tableId: "table-1",
          tableNumber: "A1",
          userDisplayName: "Иван П.",
          userEmail: "ivan.petrov@example.com",
          userId: "user-1",
          userPhone: "+79991234567",
          userTelegramUsername: "ivan_petrov"
        }
      ];
    }
  };
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService() as never
  );

  const result = await service.getAdminBookings({ status: "pending" });

  assert.deepEqual(result.data, [
    {
      contact: {
        emailMasked: "i***@example.com",
        phoneMasked: "+7*** *** **67"
      },
      endAt: "2030-05-15T13:00:00.000Z",
      id: "booking-1",
      room: {
        id: "room-1",
        name: "Большой зал"
      },
      startAt: "2030-05-15T12:00:00.000Z",
      status: BookingStatus.pending,
      table: {
        id: "table-1",
        number: "A1"
      },
      user: {
        displayName: "Иван П.",
        id: "user-1",
        telegramUsername: "ivan_petrov"
      }
    }
  ]);
});

function createConfigService() {
  return {
    get(): string | undefined {
      return "Europe/Moscow";
    }
  };
}

function createLegalService() {
  return {
    async hasAcceptedRequiredConsents(): Promise<boolean> {
      return true;
    }
  };
}

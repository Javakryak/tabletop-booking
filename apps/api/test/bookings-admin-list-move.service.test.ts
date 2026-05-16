import { ConflictException } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BookingsService } from "../src/bookings/bookings.service.js";

test("getAdminBookings returns masked contact data for queue", async () => {
  const repository = createRepository({
    booking: null,
    queue: [
      {
        endAt: new Date("2030-05-15T13:00:00.000Z"),
        id: "booking-queue-1",
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
    ]
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.getAdminBookings({ status: "pending" });

  assert.equal(repository.state.lastQueueStatusFilter, "pending");
  assert.deepEqual(result.data[0], {
    contact: {
      emailMasked: "i***@example.com",
      phoneMasked: "+7*** *** **67"
    },
    endAt: "2030-05-15T13:00:00.000Z",
    id: "booking-queue-1",
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
  });
});

test("adminMoveBooking moves pending booking and emits notification signal", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date("2030-05-15T13:00:00.000Z"),
      id: "booking-1",
      startAt: new Date("2030-05-15T12:00:00.000Z"),
      status: BookingStatus.pending,
      tableId: "table-1",
      userId: "user-1"
    },
    queue: []
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.adminMoveBooking({
    actorUserId: "admin-1",
    bookingId: "booking-1",
    endAt: "2030-05-15T14:00:00+03:00",
    reason: "Перенос по просьбе пользователя",
    startAt: "2030-05-15T13:00:00+03:00",
    tableId: "table-2"
  });

  assert.deepEqual(result.data, {
    bookingId: "booking-1",
    endAt: "2030-05-15T11:00:00.000Z",
    startAt: "2030-05-15T10:00:00.000Z",
    status: BookingStatus.pending,
    tableId: "table-2"
  });
  assert.equal(repository.state.signals.length, 1);
  assert.equal(repository.state.signals[0]?.signal, "booking_moved_user_follow_up");
  assert.equal(repository.state.moveInput?.tableId, "table-2");
  assert.equal(repository.state.moveInput?.reason, "Перенос по просьбе пользователя");
});

test("adminMoveBooking rejects conflicting target slot", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date("2030-05-15T13:00:00.000Z"),
      id: "booking-1",
      startAt: new Date("2030-05-15T12:00:00.000Z"),
      status: BookingStatus.pending,
      tableId: "table-1",
      userId: "user-1"
    },
    hasOverlappingActiveBooking: true,
    queue: []
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.adminMoveBooking({
        actorUserId: "owner-1",
        bookingId: "booking-1",
        endAt: "2030-05-15T14:00:00+03:00",
        startAt: "2030-05-15T13:00:00+03:00",
        tableId: "table-2"
      }),
    ConflictException
  );
});

function createRepository(state: {
  booking: {
    endAt: Date;
    id: string;
    startAt: Date;
    status: BookingStatus;
    tableId: string;
    userId: string;
  } | null;
  hasOverlappingActiveBooking?: boolean;
  queue: Array<{
    endAt: Date;
    id: string;
    roomId: string;
    roomName: string;
    startAt: Date;
    status: BookingStatus;
    tableId: string;
    tableNumber: string;
    userDisplayName: string;
    userEmail: string | null;
    userId: string;
    userPhone: string | null;
    userTelegramUsername: string | null;
  }>;
}) {
  const internal = {
    booking: state.booking,
    hasOverlappingActiveBooking: state.hasOverlappingActiveBooking ?? false,
    lastQueueStatusFilter: undefined as BookingStatus | undefined,
    moveInput: null as {
      endAt: Date;
      reason: string | null;
      startAt: Date;
      tableId: string;
    } | null,
    queue: state.queue,
    signals: [] as Array<{
      actorUserId: string;
      bookingId: string;
      signal: string;
      targetUserId: string;
    }>
  };

  return {
    state: internal,
    api: {
      async listAdminBookings(filters: { status?: BookingStatus }) {
        internal.lastQueueStatusFilter = filters.status;
        return internal.queue;
      },

      async findBookingForAdminAction() {
        return internal.booking;
      },

      async findActiveBookingRule() {
        return {
          allowFullDayBooking: true,
          maxActiveBookingsPerUser: 3,
          minCancelBeforeMinutes: 120,
          slotStepMinutes: 30
        };
      },

      async findActiveTableById(tableId: string) {
        return {
          capacity: 4,
          id: tableId,
          roomId: "room-1"
        };
      },

      async findScheduleExceptionByDate() {
        return null;
      },

      async findWeeklyWorkingHour() {
        return {
          closesAt: new Date("1970-01-01T23:00:00.000Z"),
          isClosed: false,
          opensAt: new Date("1970-01-01T12:00:00.000Z")
        };
      },

      async hasOverlappingRoomClosure() {
        return false;
      },

      async hasOverlappingTableClosure() {
        return false;
      },

      async hasOverlappingActiveBookingExcludingBooking() {
        return internal.hasOverlappingActiveBooking;
      },

      async moveBookingForAdmin(input: {
        bookingId: string;
        endAt: Date;
        reason: string | null;
        startAt: Date;
        tableId: string;
      }) {
        if (!internal.booking || internal.booking.id !== input.bookingId) {
          return null;
        }

        internal.moveInput = {
          endAt: input.endAt,
          reason: input.reason,
          startAt: input.startAt,
          tableId: input.tableId
        };
        internal.booking = {
          ...internal.booking,
          endAt: input.endAt,
          startAt: input.startAt,
          tableId: input.tableId
        };

        return {
          endAt: internal.booking.endAt,
          id: internal.booking.id,
          startAt: internal.booking.startAt,
          status: internal.booking.status,
          tableId: internal.booking.tableId,
          userId: internal.booking.userId
        };
      },

      async createBookingNotificationSignal(input: {
        actorUserId: string;
        bookingId: string;
        signal: string;
        targetUserId: string;
      }) {
        internal.signals.push(input);
      }
    }
  };
}

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

import { ConflictException, ForbiddenException } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BookingsService } from "../src/bookings/bookings.service.js";

test("cancelOwnBooking allows user to cancel own confirmed booking before deadline", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      id: "booking-1",
      startAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      status: BookingStatus.confirmed,
      tableId: "table-1",
      userId: "user-1"
    },
    minCancelBeforeMinutes: 120
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.cancelOwnBooking({
    actorUserId: "user-1",
    bookingId: "booking-1",
    reason: "Plans changed"
  });

  assert.deepEqual(result.data, {
    bookingId: "booking-1",
    status: BookingStatus.cancelled_by_user
  });
  assert.equal(repository.state.transitions.length, 1);
});

test("cancelOwnBooking rejects cancellation of someone else's booking", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      id: "booking-2",
      startAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      status: BookingStatus.pending,
      tableId: "table-2",
      userId: "user-owner"
    },
    minCancelBeforeMinutes: 120
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.cancelOwnBooking({
        actorUserId: "user-other",
        bookingId: "booking-2"
      }),
    ForbiddenException
  );
});

test("cancelOwnBooking rejects late cancellation according to booking rule", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date(Date.now() + 70 * 60 * 1000),
      id: "booking-3",
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      status: BookingStatus.confirmed,
      tableId: "table-3",
      userId: "user-3"
    },
    minCancelBeforeMinutes: 120
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.cancelOwnBooking({
        actorUserId: "user-3",
        bookingId: "booking-3"
      }),
    ConflictException
  );
});

test("cancelOwnBooking rejects non-cancellable status", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      id: "booking-4",
      startAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      status: BookingStatus.completed,
      tableId: "table-4",
      userId: "user-4"
    },
    minCancelBeforeMinutes: 0
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.cancelOwnBooking({
        actorUserId: "user-4",
        bookingId: "booking-4"
      }),
    ConflictException
  );
});

test("cancelOwnBooking allows user to cancel own pending booking before deadline", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      id: "booking-pending-1",
      startAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      status: BookingStatus.pending,
      tableId: "table-pending-1",
      userId: "user-pending-1"
    },
    minCancelBeforeMinutes: 120
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.cancelOwnBooking({
    actorUserId: "user-pending-1",
    bookingId: "booking-pending-1",
    reason: "No longer needed"
  });

  assert.deepEqual(result.data, {
    bookingId: "booking-pending-1",
    status: BookingStatus.cancelled_by_user
  });
  assert.equal(repository.state.transitions.length, 1);
});

test("adminCancelBooking is operational override and does not enforce user deadline", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date(Date.now() + 70 * 60 * 1000),
      id: "booking-5",
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      status: BookingStatus.confirmed,
      tableId: "table-5",
      userId: "user-5"
    },
    minCancelBeforeMinutes: 120
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.adminCancelBooking({
    actorRole: "admin",
    actorUserId: "admin-1",
    bookingId: "booking-5",
    reason: "Operational need"
  });

  assert.equal(result.data.status, BookingStatus.cancelled_by_admin);
});

function createRepository(state: {
  booking: {
    endAt: Date;
    id: string;
    startAt: Date;
    status: BookingStatus;
    tableId: string;
    userId: string;
  };
  minCancelBeforeMinutes: number;
}) {
  const internal = {
    booking: { ...state.booking },
    minCancelBeforeMinutes: state.minCancelBeforeMinutes,
    signals: [] as Array<{ signal: string }>,
    transitions: [] as Array<{
      actorRole: string;
      bookingId: string;
      toStatus: BookingStatus;
    }>
  };

  return {
    state: internal,
    api: {
      async findBookingForAdminAction() {
        return internal.booking;
      },

      async findActiveBookingRule() {
        return {
          maxActiveBookingsPerUser: 3,
          minCancelBeforeMinutes: internal.minCancelBeforeMinutes,
          slotStepMinutes: 30
        };
      },

      async findBookingStatusById(bookingId: string) {
        if (internal.booking.id !== bookingId) {
          return null;
        }

        return {
          id: internal.booking.id,
          status: internal.booking.status
        };
      },

      async transitionBookingStatus(input: {
        actorRole: "admin" | "owner" | "system" | "user";
        bookingId: string;
        fromStatus: BookingStatus;
        toStatus: BookingStatus;
      }) {
        if (internal.booking.id !== input.bookingId || internal.booking.status !== input.fromStatus) {
          return null;
        }

        internal.transitions.push({
          actorRole: input.actorRole,
          bookingId: input.bookingId,
          toStatus: input.toStatus
        });
        internal.booking = {
          ...internal.booking,
          status: input.toStatus
        };

        return {
          id: internal.booking.id,
          status: internal.booking.status
        };
      },

      async createBookingNotificationSignal(input: { signal: string }) {
        internal.signals.push({ signal: input.signal });
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

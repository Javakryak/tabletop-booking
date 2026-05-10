import { ConflictException, NotFoundException } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BookingsService } from "../src/bookings/bookings.service.js";

test("adminConfirmBooking confirms pending booking and emits notification signal", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date("2026-05-12T10:00:00.000Z"),
      id: "booking-1",
      startAt: new Date("2026-05-12T09:00:00.000Z"),
      status: BookingStatus.pending,
      tableId: "table-1",
      userId: "user-1"
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.adminConfirmBooking({
    actorRole: "admin",
    actorUserId: "admin-1",
    bookingId: "booking-1"
  });

  assert.deepEqual(result.data, {
    bookingId: "booking-1",
    status: BookingStatus.confirmed
  });
  assert.equal(repository.state.transitions.length, 1);
  assert.equal(repository.state.signals.length, 1);
  assert.equal(repository.state.signals[0]?.signal, "booking_confirmed_user_follow_up");
});

test("adminConfirmBooking rejects when confirmed overlap exists", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date("2026-05-12T10:00:00.000Z"),
      id: "booking-1",
      startAt: new Date("2026-05-12T09:00:00.000Z"),
      status: BookingStatus.pending,
      tableId: "table-1",
      userId: "user-1"
    },
    hasConfirmedOverlap: true
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.adminConfirmBooking({
        actorRole: "owner",
        actorUserId: "owner-1",
        bookingId: "booking-1"
      }),
    ConflictException
  );
  assert.equal(repository.state.transitions.length, 0);
});

test("adminCancelBooking cancels booking and emits notification signal", async () => {
  const repository = createRepository({
    booking: {
      endAt: new Date("2026-05-12T10:00:00.000Z"),
      id: "booking-2",
      startAt: new Date("2026-05-12T09:00:00.000Z"),
      status: BookingStatus.confirmed,
      tableId: "table-2",
      userId: "user-2"
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.adminCancelBooking({
    actorRole: "admin",
    actorUserId: "admin-1",
    bookingId: "booking-2",
    reason: "Room unavailable"
  });

  assert.deepEqual(result.data, {
    bookingId: "booking-2",
    status: BookingStatus.cancelled_by_admin
  });
  assert.equal(repository.state.signals[0]?.signal, "booking_cancelled_user_follow_up");
});

test("adminCancelBooking rejects unknown booking", async () => {
  const repository = createRepository({ booking: null });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.adminCancelBooking({
        actorRole: "admin",
        actorUserId: "admin-1",
        bookingId: "missing-booking"
      }),
    NotFoundException
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
  hasConfirmedOverlap?: boolean;
}) {
  const internal = {
    booking: state.booking,
    hasConfirmedOverlap: state.hasConfirmedOverlap ?? false,
    signals: [] as Array<{
      actorUserId: string;
      bookingId: string;
      signal: string;
      targetUserId: string;
    }>,
    transitions: [] as Array<{
      bookingId: string;
      fromStatus: BookingStatus;
      toStatus: BookingStatus;
    }>
  };

  return {
    state: internal,
    api: {
      async findBookingForAdminAction() {
        return internal.booking;
      },

      async hasOverlappingConfirmedBooking() {
        return internal.hasConfirmedOverlap;
      },

      async findBookingStatusById(bookingId: string) {
        if (!internal.booking || internal.booking.id !== bookingId) {
          return null;
        }

        return {
          id: internal.booking.id,
          status: internal.booking.status
        };
      },

      async transitionBookingStatus(input: {
        bookingId: string;
        fromStatus: BookingStatus;
        toStatus: BookingStatus;
      }) {
        if (!internal.booking || internal.booking.id !== input.bookingId) {
          return null;
        }

        if (internal.booking.status !== input.fromStatus) {
          return null;
        }

        internal.transitions.push({
          bookingId: input.bookingId,
          fromStatus: input.fromStatus,
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

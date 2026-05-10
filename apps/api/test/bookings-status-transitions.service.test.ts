import { ConflictException, NotFoundException } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BookingsService } from "../src/bookings/bookings.service.js";

test("allows pending to confirmed transition and records admin audit intent", async () => {
  const repository = createTransitionRepository({
    id: "booking-1",
    status: BookingStatus.pending
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.transitionBookingStatus({
    actorRole: "admin",
    actorUserId: "admin-1",
    bookingId: "booking-1",
    reason: "Approved",
    toStatus: BookingStatus.confirmed
  });

  assert.deepEqual(result.data, {
    bookingId: "booking-1",
    status: BookingStatus.confirmed
  });
  assert.equal(repository.state.history.length, 1);
  assert.deepEqual(repository.state.history[0], {
    actorRole: "admin",
    actorUserId: "admin-1",
    fromStatus: BookingStatus.pending,
    reason: "Approved",
    toStatus: BookingStatus.confirmed
  });
  assert.equal(repository.state.auditRecords.length, 1);
});

test("allows confirmed to completed transition without admin audit", async () => {
  const repository = createTransitionRepository({
    id: "booking-2",
    status: BookingStatus.confirmed
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  const result = await service.transitionBookingStatus({
    actorRole: "system",
    actorUserId: null,
    bookingId: "booking-2",
    toStatus: BookingStatus.completed
  });

  assert.deepEqual(result.data, {
    bookingId: "booking-2",
    status: BookingStatus.completed
  });
  assert.equal(repository.state.history.length, 1);
  assert.equal(repository.state.auditRecords.length, 0);
});

test("rejects invalid status transition", async () => {
  const repository = createTransitionRepository({
    id: "booking-3",
    status: BookingStatus.pending
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.transitionBookingStatus({
        actorRole: "user",
        actorUserId: "user-1",
        bookingId: "booking-3",
        toStatus: BookingStatus.completed
      }),
    ConflictException
  );
  assert.equal(repository.state.history.length, 0);
});

test("rejects transition for missing booking", async () => {
  const repository = createTransitionRepository(null);
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.transitionBookingStatus({
        actorRole: "admin",
        actorUserId: "admin-1",
        bookingId: "missing-booking",
        toStatus: BookingStatus.confirmed
      }),
    NotFoundException
  );
});

test("rejects when booking status changed concurrently", async () => {
  const repository = createTransitionRepository(
    {
      id: "booking-4",
      status: BookingStatus.confirmed
    },
    {
      failTransition: true
    }
  );
  const service = new BookingsService(
    createConfigService() as never,
    repository.api as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.transitionBookingStatus({
        actorRole: "admin",
        actorUserId: "admin-1",
        bookingId: "booking-4",
        toStatus: BookingStatus.cancelled_by_admin
      }),
    ConflictException
  );
});

function createTransitionRepository(
  booking: { id: string; status: BookingStatus } | null,
  options?: {
    failTransition?: boolean;
  }
) {
  const state: {
    auditRecords: Array<{ actorRole: string; toStatus: BookingStatus }>;
    booking: { id: string; status: BookingStatus } | null;
    history: Array<{
      actorRole: "admin" | "owner" | "system" | "user";
      actorUserId: string | null;
      fromStatus: BookingStatus;
      reason: string | null;
      toStatus: BookingStatus;
    }>;
  } = {
    auditRecords: [],
    booking,
    history: []
  };

  return {
    state,
    api: {
      async findBookingStatusById(bookingId: string): Promise<{ id: string; status: BookingStatus } | null> {
        if (!state.booking || state.booking.id !== bookingId) {
          return null;
        }

        return {
          id: state.booking.id,
          status: state.booking.status
        };
      },

      async transitionBookingStatus(input: {
        actorRole: "admin" | "owner" | "system" | "user";
        actorUserId: string | null;
        bookingId: string;
        fromStatus: BookingStatus;
        reason: string | null;
        toStatus: BookingStatus;
      }): Promise<{ id: string; status: BookingStatus } | null> {
        if (options?.failTransition) {
          return null;
        }

        if (!state.booking || state.booking.id !== input.bookingId) {
          return null;
        }

        if (state.booking.status !== input.fromStatus) {
          return null;
        }

        state.booking = {
          id: state.booking.id,
          status: input.toStatus
        };
        state.history.push({
          actorRole: input.actorRole,
          actorUserId: input.actorUserId,
          fromStatus: input.fromStatus,
          reason: input.reason,
          toStatus: input.toStatus
        });
        if (input.actorRole === "admin" || input.actorRole === "owner") {
          state.auditRecords.push({
            actorRole: input.actorRole,
            toStatus: input.toStatus
          });
        }

        return {
          id: state.booking.id,
          status: state.booking.status
        };
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

import { BadRequestException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BookingsService } from "../src/bookings/bookings.service.js";

test("getBookingRules returns normalized active booking rule", async () => {
  const repository = {
    async findActiveBookingRule() {
      return {
        allowFullDayBooking: false,
        maxActiveBookingsPerUser: 5,
        minCancelBeforeMinutes: 90,
        slotStepMinutes: 30
      };
    }
  };

  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService() as never
  );

  const result = await service.getBookingRules();

  assert.deepEqual(result.data, {
    allowFullDayBooking: false,
    maxActiveBookingsPerUser: 5,
    minCancellationNoticeMinutes: 90,
    slotMinutes: 30
  });
});

test("updateBookingRules rejects slotMinutes other than 30", async () => {
  const repository = {
    async updateActiveBookingRules() {
      throw new Error("should not be called");
    }
  };

  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.updateBookingRules("owner-1", {
        allowFullDayBooking: true,
        maxActiveBookingsPerUser: 4,
        minCancellationNoticeMinutes: 120,
        slotMinutes: 60
      }),
    BadRequestException
  );
});

test("updateBookingRules persists and returns updated values", async () => {
  const updates: Array<{
    actorUserId: string;
    allowFullDayBooking: boolean;
    maxActiveBookingsPerUser: number;
    minCancelBeforeMinutes: number;
    slotStepMinutes: number;
  }> = [];

  const repository = {
    async updateActiveBookingRules(input: {
      actorUserId: string;
      allowFullDayBooking: boolean;
      maxActiveBookingsPerUser: number;
      minCancelBeforeMinutes: number;
      slotStepMinutes: number;
    }) {
      updates.push(input);

      return {
        allowFullDayBooking: input.allowFullDayBooking,
        maxActiveBookingsPerUser: input.maxActiveBookingsPerUser,
        minCancelBeforeMinutes: input.minCancelBeforeMinutes,
        slotStepMinutes: input.slotStepMinutes
      };
    }
  };

  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService() as never
  );

  const result = await service.updateBookingRules("owner-42", {
    allowFullDayBooking: true,
    maxActiveBookingsPerUser: 2,
    minCancellationNoticeMinutes: 45,
    slotMinutes: 30
  });

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], {
    actorUserId: "owner-42",
    allowFullDayBooking: true,
    maxActiveBookingsPerUser: 2,
    minCancelBeforeMinutes: 45,
    slotStepMinutes: 30
  });
  assert.deepEqual(result.data, {
    allowFullDayBooking: true,
    maxActiveBookingsPerUser: 2,
    minCancellationNoticeMinutes: 45,
    slotMinutes: 30
  });
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

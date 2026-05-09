import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { ScheduleExceptionsService } from "../src/schedule/schedule-exceptions.service.js";

type ScheduleExceptionRecord = {
  closesAt: Date | null;
  date: Date;
  id: string;
  isClosed: boolean;
  opensAt: Date | null;
  reason: string | null;
};

type WorkingHourRecord = {
  closesAt: Date | null;
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: Date | null;
};

test("createScheduleException stores closed day and lists it", async () => {
  const { exceptionsRepository, scheduleRepository } = createInMemoryRepositories();
  const service = new ScheduleExceptionsService(
    scheduleRepository as never,
    exceptionsRepository as never
  );

  const created = await service.createScheduleException("owner-1", {
    date: "2026-05-09",
    type: "closed"
  });
  const listed = await service.listScheduleExceptions();

  assert.equal(created.data.isClosed, true);
  assert.equal(created.data.opensAt, null);
  assert.equal(created.data.closesAt, null);
  assert.equal(created.data.type, "closed");
  assert.equal(listed.data.length, 1);
});

test("createScheduleException rejects non-closed payload without times", async () => {
  const { exceptionsRepository, scheduleRepository } = createInMemoryRepositories();
  const service = new ScheduleExceptionsService(
    scheduleRepository as never,
    exceptionsRepository as never
  );

  await assert.rejects(
    () =>
      service.createScheduleException("owner-1", {
        date: "2026-05-10",
        type: "short_day"
      }),
    BadRequestException
  );
});

test("createScheduleException maps duplicate date to conflict", async () => {
  const { exceptionsRepository, scheduleRepository } = createInMemoryRepositories();
  const service = new ScheduleExceptionsService(
    scheduleRepository as never,
    exceptionsRepository as never
  );

  await service.createScheduleException("owner-1", {
    date: "2026-05-11",
    type: "closed"
  });

  await assert.rejects(
    () =>
      service.createScheduleException("owner-1", {
        date: "2026-05-11",
        type: "closed"
      }),
    ConflictException
  );
});

test("updateScheduleException rejects missing exception", async () => {
  const { exceptionsRepository, scheduleRepository } = createInMemoryRepositories();
  const service = new ScheduleExceptionsService(
    scheduleRepository as never,
    exceptionsRepository as never
  );

  await assert.rejects(
    () =>
      service.updateScheduleException("missing-id", {
        reason: "updated"
      }),
    NotFoundException
  );
});

test("getEffectiveScheduleForDate uses exception override over weekly schedule", async () => {
  const { exceptionsRepository, scheduleRepository } = createInMemoryRepositories();
  const service = new ScheduleExceptionsService(
    scheduleRepository as never,
    exceptionsRepository as never
  );

  await service.createScheduleException("owner-1", {
    date: "2026-05-12",
    type: "short_day",
    opensAt: "13:00",
    closesAt: "18:00"
  });

  const effective = await service.getEffectiveScheduleForDate("2026-05-12");

  assert.equal(effective.data.source, "exception");
  assert.equal(effective.data.isClosed, false);
  assert.equal(effective.data.opensAt, "13:00");
  assert.equal(effective.data.closesAt, "18:00");
});

test("getEffectiveScheduleForDate falls back to weekly schedule when no exception", async () => {
  const { exceptionsRepository, scheduleRepository } = createInMemoryRepositories();
  const service = new ScheduleExceptionsService(
    scheduleRepository as never,
    exceptionsRepository as never
  );

  const effective = await service.getEffectiveScheduleForDate("2026-05-13");

  assert.equal(effective.data.source, "weekly");
  assert.equal(effective.data.isClosed, false);
  assert.equal(effective.data.opensAt, "12:00");
  assert.equal(effective.data.closesAt, "22:00");
});

function createInMemoryRepositories() {
  let counter = 1;
  const byId = new Map<string, ScheduleExceptionRecord>();
  const byDateKey = new Map<string, string>();

  const weeklyHours: WorkingHourRecord[] = [
    {
      dayOfWeek: 1,
      isClosed: false,
      opensAt: time("12:00"),
      closesAt: time("22:00")
    },
    {
      dayOfWeek: 2,
      isClosed: false,
      opensAt: time("12:00"),
      closesAt: time("22:00")
    },
    {
      dayOfWeek: 3,
      isClosed: false,
      opensAt: time("12:00"),
      closesAt: time("22:00")
    }
  ];

  const exceptionsRepository = {
    async listScheduleExceptions(): Promise<ScheduleExceptionRecord[]> {
      return [...byId.values()]
        .sort((left, right) => left.date.getTime() - right.date.getTime())
        .map((exception) => ({ ...exception }));
    },

    async findScheduleExceptionById(exceptionId: string): Promise<ScheduleExceptionRecord | null> {
      const found = byId.get(exceptionId);
      return found ? { ...found } : null;
    },

    async findScheduleExceptionByDate(date: Date): Promise<ScheduleExceptionRecord | null> {
      const key = formatDate(date);
      const id = byDateKey.get(key);
      if (!id) {
        return null;
      }

      const found = byId.get(id);
      return found ? { ...found } : null;
    },

    async createScheduleException(input: {
      closesAt: Date | null;
      createdByUserId: string | null;
      date: Date;
      isClosed: boolean;
      opensAt: Date | null;
      reason: string | null;
    }): Promise<ScheduleExceptionRecord> {
      const key = formatDate(input.date);
      if (byDateKey.has(key)) {
        throw {
          code: "P2002",
          meta: {
            target: ["date"]
          }
        };
      }

      const record: ScheduleExceptionRecord = {
        closesAt: input.closesAt,
        date: input.date,
        id: `exception-${counter++}`,
        isClosed: input.isClosed,
        opensAt: input.opensAt,
        reason: input.reason
      };
      byId.set(record.id, record);
      byDateKey.set(key, record.id);

      return { ...record };
    },

    async updateScheduleException(
      exceptionId: string,
      input: {
        closesAt?: Date | null;
        isClosed?: boolean;
        opensAt?: Date | null;
        reason?: string | null;
      }
    ): Promise<ScheduleExceptionRecord | null> {
      const current = byId.get(exceptionId);
      if (!current) {
        return null;
      }

      const updated: ScheduleExceptionRecord = {
        ...current,
        closesAt: input.closesAt !== undefined ? input.closesAt : current.closesAt,
        isClosed: input.isClosed !== undefined ? input.isClosed : current.isClosed,
        opensAt: input.opensAt !== undefined ? input.opensAt : current.opensAt,
        reason: input.reason !== undefined ? input.reason : current.reason
      };
      byId.set(exceptionId, updated);

      return { ...updated };
    },

    async deleteScheduleException(exceptionId: string): Promise<ScheduleExceptionRecord | null> {
      const current = byId.get(exceptionId);
      if (!current) {
        return null;
      }

      byId.delete(exceptionId);
      byDateKey.delete(formatDate(current.date));
      return { ...current };
    }
  };

  const scheduleRepository = {
    async listWorkingHours(): Promise<WorkingHourRecord[]> {
      return [...weeklyHours].map((day) => ({ ...day }));
    }
  };

  return { exceptionsRepository, scheduleRepository };
}

function time(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

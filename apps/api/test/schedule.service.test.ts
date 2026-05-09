import { BadRequestException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { ScheduleService } from "../src/schedule/schedule.service.js";

type WorkingHourRecord = {
  closesAt: Date | null;
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: Date | null;
};

test("getWorkingHours returns sorted weekly schedule payload", async () => {
  const repository = createInMemoryScheduleRepository();
  const service = new ScheduleService(createConfigService() as never, repository as never);

  const result = await service.getWorkingHours();

  assert.equal(result.data.timezone, "Europe/Moscow");
  assert.equal(result.data.days.length, 2);
  assert.deepEqual(result.data.days[0], {
    closesAt: "22:00",
    dayOfWeek: 1,
    isClosed: false,
    opensAt: "12:00"
  });
  assert.deepEqual(result.data.days[1], {
    closesAt: null,
    dayOfWeek: 7,
    isClosed: true,
    opensAt: null
  });
});

test("updateWorkingHours rejects duplicate day values", async () => {
  const repository = createInMemoryScheduleRepository();
  const service = new ScheduleService(createConfigService() as never, repository as never);

  await assert.rejects(
    () =>
      service.updateWorkingHours({
        days: [
          { dayOfWeek: 1, isClosed: true },
          { dayOfWeek: 1, isClosed: true }
        ],
        timezone: "Europe/Moscow"
      }),
    BadRequestException
  );
});

test("updateWorkingHours rejects invalid open/close combinations", async () => {
  const repository = createInMemoryScheduleRepository();
  const service = new ScheduleService(createConfigService() as never, repository as never);

  await assert.rejects(
    () =>
      service.updateWorkingHours({
        days: [{ dayOfWeek: 2, isClosed: false, opensAt: "22:00", closesAt: "12:00" }],
        timezone: "Europe/Moscow"
      }),
    BadRequestException
  );
});

test("updateWorkingHours rejects unsupported timezone value", async () => {
  const repository = createInMemoryScheduleRepository();
  const service = new ScheduleService(createConfigService() as never, repository as never);

  await assert.rejects(
    () =>
      service.updateWorkingHours({
        days: [{ dayOfWeek: 1, isClosed: true }],
        timezone: "Europe/Paris"
      }),
    BadRequestException
  );
});

test("updateWorkingHours updates open day and closed day records", async () => {
  const repository = createInMemoryScheduleRepository();
  const service = new ScheduleService(createConfigService() as never, repository as never);

  const result = await service.updateWorkingHours({
    days: [
      { dayOfWeek: 1, isClosed: false, opensAt: "11:00", closesAt: "21:00" },
      { dayOfWeek: 2, isClosed: true }
    ],
    timezone: "Europe/Moscow"
  });

  const monday = result.data.days.find((day) => day.dayOfWeek === 1);
  const tuesday = result.data.days.find((day) => day.dayOfWeek === 2);
  assert.deepEqual(monday, {
    closesAt: "21:00",
    dayOfWeek: 1,
    isClosed: false,
    opensAt: "11:00"
  });
  assert.deepEqual(tuesday, {
    closesAt: null,
    dayOfWeek: 2,
    isClosed: true,
    opensAt: null
  });
});

function createConfigService() {
  return {
    get(key: string): string | undefined {
      if (key === "SCHEDULE_TIMEZONE") {
        return "Europe/Moscow";
      }

      return undefined;
    }
  };
}

function createInMemoryScheduleRepository() {
  const byDay = new Map<number, WorkingHourRecord>([
    [
      1,
      {
        closesAt: time("22:00"),
        dayOfWeek: 1,
        isClosed: false,
        opensAt: time("12:00")
      }
    ],
    [
      7,
      {
        closesAt: null,
        dayOfWeek: 7,
        isClosed: true,
        opensAt: null
      }
    ]
  ]);

  return {
    async listWorkingHours(): Promise<WorkingHourRecord[]> {
      return [...byDay.values()]
        .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
        .map((day) => ({ ...day }));
    },

    async upsertWorkingHours(
      days: Array<{
        closesAt: Date | null;
        dayOfWeek: number;
        isClosed: boolean;
        opensAt: Date | null;
      }>
    ): Promise<void> {
      for (const day of days) {
        byDay.set(day.dayOfWeek, { ...day });
      }
    }
  };
}

function time(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

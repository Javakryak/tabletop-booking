import { BadRequestException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BookingsService } from "../src/bookings/bookings.service.js";

type ScheduleRecord = {
  closesAt: Date | null;
  isClosed: boolean;
  opensAt: Date | null;
};

type RoomRecord = {
  id: string;
  name: string;
  sortOrder: number;
  tables: Array<{
    capacity: number;
    id: string;
    number: string;
    sortOrder: number;
  }>;
};

type TimeRangeRecord = {
  endAt: Date;
  startAt: Date;
};

test("returns no slots when schedule exception marks a day as closed", async () => {
  const repository = createRepository({
    scheduleException: {
      closesAt: null,
      isClosed: true,
      opensAt: null
    },
    weeklyWorkingHour: {
      closesAt: time("22:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    rooms: [
      {
        id: "room-1",
        name: "Main",
        sortOrder: 1,
        tables: [{ capacity: 4, id: "table-1", number: "T1", sortOrder: 1 }]
      }
    ]
  });
  const service = new BookingsService(createConfigService() as never, repository as never);

  const result = await service.getAvailability({ date: "2026-05-12" });

  assert.equal(result.data.slotMinutes, 30);
  assert.equal(result.data.rooms.length, 0);
});

test("filters out blocked slots and removes tables with no available slots", async () => {
  const date = "2026-05-12";
  const repository = createRepository({
    weeklyWorkingHour: {
      closesAt: time("14:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    rooms: [
      {
        id: "room-a",
        name: "Main",
        sortOrder: 1,
        tables: [
          { capacity: 4, id: "table-a1", number: "T1", sortOrder: 1 },
          { capacity: 6, id: "table-a2", number: "T2", sortOrder: 2 }
        ]
      },
      {
        id: "room-b",
        name: "Side",
        sortOrder: 2,
        tables: [{ capacity: 4, id: "table-b1", number: "S1", sortOrder: 1 }]
      }
    ],
    roomClosures: {
      "room-b": [
        {
          startAt: zonedDateTime(date, "12:00"),
          endAt: zonedDateTime(date, "14:00")
        }
      ]
    },
    tableClosures: {
      "table-a2": [
        {
          startAt: zonedDateTime(date, "12:30"),
          endAt: zonedDateTime(date, "13:00")
        }
      ]
    },
    activeBookings: {
      "table-a1": [
        {
          startAt: zonedDateTime(date, "13:00"),
          endAt: zonedDateTime(date, "13:30")
        }
      ]
    }
  });
  const service = new BookingsService(createConfigService() as never, repository as never);

  const result = await service.getAvailability({ date });

  assert.equal(result.data.rooms.length, 1);
  assert.equal(result.data.rooms[0]?.id, "room-a");

  const tableA1 = result.data.rooms[0]?.tables.find((table) => table.id === "table-a1");
  const tableA2 = result.data.rooms[0]?.tables.find((table) => table.id === "table-a2");

  assert.deepEqual(
    tableA1?.availableSlots.map((slot) => [slot.startAt, slot.endAt]),
    [
      [iso(date, "12:00"), iso(date, "12:30")],
      [iso(date, "12:30"), iso(date, "13:00")],
      [iso(date, "13:30"), iso(date, "14:00")]
    ]
  );

  assert.deepEqual(
    tableA2?.availableSlots.map((slot) => [slot.startAt, slot.endAt]),
    [
      [iso(date, "12:00"), iso(date, "12:30")],
      [iso(date, "13:00"), iso(date, "13:30")],
      [iso(date, "13:30"), iso(date, "14:00")]
    ]
  );
});

test("supports durationMinutes as a slot-multiple filter", async () => {
  const date = "2026-05-12";
  const repository = createRepository({
    weeklyWorkingHour: {
      closesAt: time("13:30"),
      isClosed: false,
      opensAt: time("12:00")
    },
    rooms: [
      {
        id: "room-1",
        name: "Main",
        sortOrder: 1,
        tables: [{ capacity: 4, id: "table-1", number: "T1", sortOrder: 1 }]
      }
    ]
  });
  const service = new BookingsService(createConfigService() as never, repository as never);

  const result = await service.getAvailability({
    date,
    durationMinutes: 60
  });

  const slots = result.data.rooms[0]?.tables[0]?.availableSlots ?? [];
  assert.deepEqual(
    slots.map((slot) => [slot.startAt, slot.endAt]),
    [
      [iso(date, "12:00"), iso(date, "13:00")],
      [iso(date, "12:30"), iso(date, "13:30")]
    ]
  );
});

test("rejects durationMinutes that does not align with slot step", async () => {
  const repository = createRepository({
    slotStepMinutes: 30,
    weeklyWorkingHour: {
      closesAt: time("14:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    rooms: []
  });
  const service = new BookingsService(createConfigService() as never, repository as never);

  await assert.rejects(
    () =>
      service.getAvailability({
        date: "2026-05-12",
        durationMinutes: 45
      }),
    BadRequestException
  );
});

function createRepository(state: {
  activeBookings?: Record<string, TimeRangeRecord[]>;
  roomClosures?: Record<string, TimeRangeRecord[]>;
  rooms: RoomRecord[];
  scheduleException?: ScheduleRecord | null;
  slotStepMinutes?: number | null;
  tableClosures?: Record<string, TimeRangeRecord[]>;
  weeklyWorkingHour?: ScheduleRecord | null;
}) {
  const slotStep = state.slotStepMinutes ?? 30;
  const scheduleException = state.scheduleException ?? null;
  const weeklyWorkingHour = state.weeklyWorkingHour ?? null;
  const roomClosures = state.roomClosures ?? {};
  const tableClosures = state.tableClosures ?? {};
  const activeBookings = state.activeBookings ?? {};

  return {
    async findSlotStepMinutes(): Promise<number | null> {
      return slotStep;
    },

    async findScheduleExceptionByDate(): Promise<ScheduleRecord | null> {
      return scheduleException;
    },

    async findWeeklyWorkingHour(): Promise<ScheduleRecord | null> {
      return weeklyWorkingHour;
    },

    async listActiveRoomsWithTables(filters: {
      partySize?: number;
      roomId?: string;
    }): Promise<RoomRecord[]> {
      return state.rooms
        .filter((room) => !filters.roomId || room.id === filters.roomId)
        .map((room) => ({
          ...room,
          tables: room.tables.filter(
            (table) => !filters.partySize || table.capacity >= filters.partySize
          )
        }));
    },

    async listRoomClosuresOverlapping(roomIds: string[]): Promise<Array<TimeRangeRecord & { roomId: string }>> {
      return roomIds.flatMap((roomId) =>
        (roomClosures[roomId] ?? []).map((closure) => ({ ...closure, roomId }))
      );
    },

    async listTableClosuresOverlapping(
      tableIds: string[]
    ): Promise<Array<TimeRangeRecord & { tableId: string }>> {
      return tableIds.flatMap((tableId) =>
        (tableClosures[tableId] ?? []).map((closure) => ({ ...closure, tableId }))
      );
    },

    async listActiveBookingsOverlapping(
      tableIds: string[]
    ): Promise<Array<TimeRangeRecord & { tableId: string }>> {
      return tableIds.flatMap((tableId) =>
        (activeBookings[tableId] ?? []).map((booking) => ({ ...booking, tableId }))
      );
    }
  };
}

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

function time(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function zonedDateTime(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00+03:00`);
}

function iso(date: string, hhmm: string): string {
  return zonedDateTime(date, hhmm).toISOString();
}

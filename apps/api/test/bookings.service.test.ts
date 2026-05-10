import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
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
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService() as never
  );

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
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService() as never
  );

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
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService() as never
  );

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
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService() as never
  );

  await assert.rejects(
    () =>
      service.getAvailability({
        date: "2026-05-12",
        durationMinutes: 45
      }),
    BadRequestException
  );
});

test("createBookingRequest stores pending booking when all checks pass", async () => {
  const repository = createRepository({
    activeBookingCountByUser: {
      "user-1": 0
    },
    activeRule: {
      maxActiveBookingsPerUser: 3,
      slotStepMinutes: 30
    },
    activeTableById: {
      "table-1": {
        capacity: 4,
        id: "table-1",
        roomId: "room-1"
      }
    },
    bookingCreateResult: {
      comment: "Warhammer",
      endAt: zonedDateTime("2026-05-12", "13:00"),
      id: "booking-1",
      startAt: zonedDateTime("2026-05-12", "12:00"),
      status: "pending",
      tableId: "table-1"
    },
    rooms: [],
    weeklyWorkingHour: {
      closesAt: time("22:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    users: {
      "user-1": {
        phone: "+70000000000",
        status: "active"
      }
    }
  });
  const legalService = createLegalService(true);
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    legalService as never
  );

  const result = await service.createBookingRequest("user-1", {
    comment: "Warhammer",
    endAt: "2026-05-12T13:00:00+03:00",
    startAt: "2026-05-12T12:00:00+03:00",
    tableId: "table-1"
  });

  assert.equal(result.data.status, "pending");
  assert.equal(result.data.tableId, "table-1");
  assert.equal(result.data.comment, "Warhammer");
});

test("concurrent overlapping requests keep only one valid booking", async () => {
  const repository = createConcurrentBookingRepository();
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService(true) as never
  );

  const payload = {
    endAt: "2026-05-12T13:00:00+03:00",
    startAt: "2026-05-12T12:00:00+03:00",
    tableId: "table-1"
  };

  const results = await Promise.allSettled([
    service.createBookingRequest("user-1", payload),
    service.createBookingRequest("user-2", payload)
  ]);

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);

  const success = fulfilled[0];
  if (!success || success.status !== "fulfilled") {
    throw new Error("Expected one successful booking result");
  }

  assert.equal(success.value.data.status, "pending");
  assert.equal(success.value.data.tableId, "table-1");

  const failure = rejected[0];
  if (!failure || failure.status !== "rejected") {
    throw new Error("Expected one rejected booking result");
  }

  assert.ok(failure.reason instanceof ConflictException);
  assert.equal(failure.reason.message, "The selected table is not available for this time range");
  assert.equal(repository.getCreatedBookingsCount(), 1);
});

test("createBookingRequest rejects when phone is missing", async () => {
  const repository = createRepository({
    activeTableById: {
      "table-1": {
        capacity: 4,
        id: "table-1",
        roomId: "room-1"
      }
    },
    rooms: [],
    weeklyWorkingHour: {
      closesAt: time("22:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    users: {
      "user-1": {
        phone: null,
        status: "active"
      }
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService(true) as never
  );

  await assert.rejects(
    () =>
      service.createBookingRequest("user-1", {
        endAt: "2026-05-12T13:00:00+03:00",
        startAt: "2026-05-12T12:00:00+03:00",
        tableId: "table-1"
      }),
    ForbiddenException
  );
});

test("createBookingRequest rejects when required consents are missing", async () => {
  const repository = createRepository({
    activeTableById: {
      "table-1": {
        capacity: 4,
        id: "table-1",
        roomId: "room-1"
      }
    },
    rooms: [],
    weeklyWorkingHour: {
      closesAt: time("22:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    users: {
      "user-1": {
        phone: "+70000000000",
        status: "active"
      }
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService(false) as never
  );

  await assert.rejects(
    () =>
      service.createBookingRequest("user-1", {
        endAt: "2026-05-12T13:00:00+03:00",
        startAt: "2026-05-12T12:00:00+03:00",
        tableId: "table-1"
      }),
    ForbiddenException
  );
});

test("createBookingRequest rejects when requested time is outside schedule", async () => {
  const repository = createRepository({
    activeTableById: {
      "table-1": {
        capacity: 4,
        id: "table-1",
        roomId: "room-1"
      }
    },
    rooms: [],
    weeklyWorkingHour: {
      closesAt: time("20:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    users: {
      "user-1": {
        phone: "+70000000000",
        status: "active"
      }
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService(true) as never
  );

  await assert.rejects(
    () =>
      service.createBookingRequest("user-1", {
        endAt: "2026-05-12T21:00:00+03:00",
        startAt: "2026-05-12T20:00:00+03:00",
        tableId: "table-1"
      }),
    ConflictException
  );
});

test("createBookingRequest rejects when active booking limit is reached", async () => {
  const repository = createRepository({
    activeBookingCountByUser: {
      "user-1": 3
    },
    activeRule: {
      maxActiveBookingsPerUser: 3,
      slotStepMinutes: 30
    },
    activeTableById: {
      "table-1": {
        capacity: 4,
        id: "table-1",
        roomId: "room-1"
      }
    },
    rooms: [],
    weeklyWorkingHour: {
      closesAt: time("22:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    users: {
      "user-1": {
        phone: "+70000000000",
        status: "active"
      }
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService(true) as never
  );

  await assert.rejects(
    () =>
      service.createBookingRequest("user-1", {
        endAt: "2026-05-12T13:00:00+03:00",
        startAt: "2026-05-12T12:00:00+03:00",
        tableId: "table-1"
      }),
    ConflictException
  );
});

test("createBookingRequest rejects when closure or overlap exists", async () => {
  const repository = createRepository({
    activeTableById: {
      "table-1": {
        capacity: 4,
        id: "table-1",
        roomId: "room-1"
      }
    },
    roomClosureFlags: {
      "room-1": true
    },
    rooms: [],
    weeklyWorkingHour: {
      closesAt: time("22:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    users: {
      "user-1": {
        phone: "+70000000000",
        status: "active"
      }
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService(true) as never
  );

  await assert.rejects(
    () =>
      service.createBookingRequest("user-1", {
        endAt: "2026-05-12T13:00:00+03:00",
        startAt: "2026-05-12T12:00:00+03:00",
        tableId: "table-1"
      }),
    ConflictException
  );
});

test("createBookingRequest rejects when table is inactive or missing", async () => {
  const repository = createRepository({
    rooms: [],
    weeklyWorkingHour: {
      closesAt: time("22:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    users: {
      "user-1": {
        phone: "+70000000000",
        status: "active"
      }
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService(true) as never
  );

  await assert.rejects(
    () =>
      service.createBookingRequest("user-1", {
        endAt: "2026-05-12T13:00:00+03:00",
        startAt: "2026-05-12T12:00:00+03:00",
        tableId: "table-missing"
      }),
    NotFoundException
  );
});

test("createBookingRequest rejects non-slot-aligned intervals", async () => {
  const repository = createRepository({
    activeTableById: {
      "table-1": {
        capacity: 4,
        id: "table-1",
        roomId: "room-1"
      }
    },
    rooms: [],
    weeklyWorkingHour: {
      closesAt: time("22:00"),
      isClosed: false,
      opensAt: time("12:00")
    },
    users: {
      "user-1": {
        phone: "+70000000000",
        status: "active"
      }
    }
  });
  const service = new BookingsService(
    createConfigService() as never,
    repository as never,
    createLegalService(true) as never
  );

  await assert.rejects(
    () =>
      service.createBookingRequest("user-1", {
        endAt: "2026-05-12T12:40:00+03:00",
        startAt: "2026-05-12T12:10:00+03:00",
        tableId: "table-1"
      }),
    BadRequestException
  );
});

function createRepository(state: {
  activeBookingCountByUser?: Record<string, number>;
  activeBookings?: Record<string, TimeRangeRecord[]>;
  activeRule?: {
    maxActiveBookingsPerUser: number;
    slotStepMinutes: number;
  };
  activeTableById?: Record<string, { capacity: number; id: string; roomId: string }>;
  bookingCreateResult?: {
    comment: string | null;
    endAt: Date;
    id: string;
    startAt: Date;
    status: "pending";
    tableId: string;
  } | null;
  roomClosureFlags?: Record<string, boolean>;
  roomClosures?: Record<string, TimeRangeRecord[]>;
  rooms: RoomRecord[];
  scheduleException?: ScheduleRecord | null;
  slotStepMinutes?: number | null;
  tableClosureFlags?: Record<string, boolean>;
  tableClosures?: Record<string, TimeRangeRecord[]>;
  users?: Record<string, { phone: string | null; status: "active" | "blocked" | "deleted" }>;
  weeklyWorkingHour?: ScheduleRecord | null;
}) {
  const slotStep = state.slotStepMinutes ?? 30;
  const scheduleException = state.scheduleException ?? null;
  const weeklyWorkingHour = state.weeklyWorkingHour ?? null;
  const roomClosures = state.roomClosures ?? {};
  const tableClosures = state.tableClosures ?? {};
  const activeBookings = state.activeBookings ?? {};
  const users = state.users ?? {};
  const activeTableById = state.activeTableById ?? {};
  const activeBookingCountByUser = state.activeBookingCountByUser ?? {};
  const roomClosureFlags = state.roomClosureFlags ?? {};
  const tableClosureFlags = state.tableClosureFlags ?? {};

  return {
    async findActiveBookingRule(): Promise<{
      maxActiveBookingsPerUser: number;
      slotStepMinutes: number;
    } | null> {
      return (
        state.activeRule ?? {
          maxActiveBookingsPerUser: 3,
          slotStepMinutes: slotStep
        }
      );
    },

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

    async listRoomClosuresOverlapping(
      roomIds: string[]
    ): Promise<Array<TimeRangeRecord & { roomId: string }>> {
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
    },

    async findBookingUserById(userId: string): Promise<{
      phone: string | null;
      status: "active" | "blocked" | "deleted";
    } | null> {
      return users[userId] ?? null;
    },

    async findActiveTableById(tableId: string): Promise<{
      capacity: number;
      id: string;
      roomId: string;
    } | null> {
      return activeTableById[tableId] ?? null;
    },

    async countActiveBookingsByUser(userId: string): Promise<number> {
      return activeBookingCountByUser[userId] ?? 0;
    },

    async hasOverlappingRoomClosure(roomId: string): Promise<boolean> {
      return roomClosureFlags[roomId] ?? false;
    },

    async hasOverlappingTableClosure(tableId: string): Promise<boolean> {
      return tableClosureFlags[tableId] ?? false;
    },

    async createPendingBooking(input: {
      actorUserId: string;
      comment: string | null;
      endAt: Date;
      startAt: Date;
      tableId: string;
    }): Promise<{
      comment: string | null;
      endAt: Date;
      id: string;
      startAt: Date;
      status: "pending";
      tableId: string;
    } | null> {
      if (state.bookingCreateResult !== undefined) {
        return state.bookingCreateResult;
      }

      return {
        comment: input.comment,
        endAt: input.endAt,
        id: "booking-created",
        startAt: input.startAt,
        status: "pending",
        tableId: input.tableId
      };
    }
  };
}

function createConcurrentBookingRepository() {
  const users: Record<string, { phone: string; status: "active" | "blocked" | "deleted" }> = {
    "user-1": {
      phone: "+70000000001",
      status: "active"
    },
    "user-2": {
      phone: "+70000000002",
      status: "active"
    }
  };

  const bookings: Array<{
    comment: string | null;
    endAt: Date;
    id: string;
    startAt: Date;
    status: "pending";
    tableId: string;
    userId: string;
  }> = [];
  let nextBookingId = 1;
  let waitingCreateCalls = 0;

  let releaseCreateGate: (() => void) | null = null;
  const createGate = new Promise<void>((resolve) => {
    releaseCreateGate = resolve;
  });

  let transactionQueue = Promise.resolve();

  async function withTransactionLock<T>(work: () => Promise<T>): Promise<T> {
    const previous = transactionQueue;
    let release!: () => void;
    transactionQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }

  function overlaps(
    firstStartAt: Date,
    firstEndAt: Date,
    secondStartAt: Date,
    secondEndAt: Date
  ): boolean {
    return firstStartAt < secondEndAt && firstEndAt > secondStartAt;
  }

  return {
    async findActiveBookingRule(): Promise<{
      maxActiveBookingsPerUser: number;
      slotStepMinutes: number;
    }> {
      return {
        maxActiveBookingsPerUser: 3,
        slotStepMinutes: 30
      };
    },

    async findScheduleExceptionByDate(): Promise<null> {
      return null;
    },

    async findWeeklyWorkingHour(): Promise<ScheduleRecord> {
      return {
        closesAt: time("22:00"),
        isClosed: false,
        opensAt: time("12:00")
      };
    },

    async listActiveBookingsOverlapping(
      tableIds: string[],
      startAt: Date,
      endAt: Date
    ): Promise<Array<TimeRangeRecord & { tableId: string }>> {
      return bookings
        .filter(
          (booking) =>
            tableIds.includes(booking.tableId) &&
            overlaps(booking.startAt, booking.endAt, startAt, endAt)
        )
        .map((booking) => ({
          endAt: booking.endAt,
          startAt: booking.startAt,
          tableId: booking.tableId
        }));
    },

    async findBookingUserById(userId: string): Promise<{
      phone: string | null;
      status: "active" | "blocked" | "deleted";
    } | null> {
      return users[userId] ?? null;
    },

    async findActiveTableById(): Promise<{ capacity: number; id: string; roomId: string }> {
      return {
        capacity: 4,
        id: "table-1",
        roomId: "room-1"
      };
    },

    async countActiveBookingsByUser(userId: string): Promise<number> {
      return bookings.filter((booking) => booking.userId === userId).length;
    },

    async hasOverlappingRoomClosure(): Promise<boolean> {
      return false;
    },

    async hasOverlappingTableClosure(): Promise<boolean> {
      return false;
    },

    async createPendingBooking(input: {
      actorUserId: string;
      comment: string | null;
      endAt: Date;
      startAt: Date;
      tableId: string;
    }): Promise<{
      comment: string | null;
      endAt: Date;
      id: string;
      startAt: Date;
      status: "pending";
      tableId: string;
    } | null> {
      waitingCreateCalls += 1;
      if (waitingCreateCalls === 2) {
        releaseCreateGate?.();
      }
      await createGate;

      return await withTransactionLock(async () => {
        const hasOverlap = bookings.some(
          (booking) =>
            booking.tableId === input.tableId &&
            overlaps(booking.startAt, booking.endAt, input.startAt, input.endAt)
        );
        if (hasOverlap) {
          return null;
        }

        const created = {
          comment: input.comment,
          endAt: input.endAt,
          id: `booking-${nextBookingId}`,
          startAt: input.startAt,
          status: "pending" as const,
          tableId: input.tableId,
          userId: input.actorUserId
        };
        nextBookingId += 1;
        bookings.push(created);

        return {
          comment: created.comment,
          endAt: created.endAt,
          id: created.id,
          startAt: created.startAt,
          status: created.status,
          tableId: created.tableId
        };
      });
    },

    getCreatedBookingsCount(): number {
      return bookings.length;
    }
  };
}

function createLegalService(hasRequiredConsents = true) {
  return {
    async hasAcceptedRequiredConsents(): Promise<boolean> {
      return hasRequiredConsents;
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

import { BadRequestException, NotFoundException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { ClosuresService } from "../src/rooms/closures.service.js";

type RoomClosureRecord = {
  endAt: Date;
  id: string;
  reason: string | null;
  roomId: string;
  startAt: Date;
};

type TableClosureRecord = {
  endAt: Date;
  id: string;
  reason: string | null;
  startAt: Date;
  tableId: string;
};

test("createRoomClosure stores a valid room interval", async () => {
  const repository = createInMemoryClosuresRepository();
  const service = new ClosuresService(repository as never);

  const result = await service.createRoomClosure(
    "owner-1",
    "room-1",
    {
      startAt: "2026-05-02T12:00:00.000Z",
      endAt: "2026-05-02T18:00:00.000Z",
      reason: "Maintenance"
    }
  );

  assert.equal(result.data.roomId, "room-1");
  assert.equal(result.data.reason, "Maintenance");
  assert.ok(result.data.startAt < result.data.endAt);
});

test("createTableClosure stores a valid table interval", async () => {
  const repository = createInMemoryClosuresRepository();
  const service = new ClosuresService(repository as never);

  const result = await service.createTableClosure(
    "owner-1",
    "table-1",
    {
      startAt: "2026-05-02T12:00:00.000Z",
      endAt: "2026-05-02T18:00:00.000Z",
      reason: "Private event"
    }
  );

  assert.equal(result.data.tableId, "table-1");
  assert.equal(result.data.reason, "Private event");
  assert.ok(result.data.startAt < result.data.endAt);
});

test("createRoomClosure rejects unknown room", async () => {
  const repository = createInMemoryClosuresRepository();
  const service = new ClosuresService(repository as never);

  await assert.rejects(
    () =>
      service.createRoomClosure("owner-1", "room-missing", {
        startAt: "2026-05-02T12:00:00.000Z",
        endAt: "2026-05-02T18:00:00.000Z"
      }),
    NotFoundException
  );
});

test("createTableClosure rejects unknown table", async () => {
  const repository = createInMemoryClosuresRepository();
  const service = new ClosuresService(repository as never);

  await assert.rejects(
    () =>
      service.createTableClosure("owner-1", "table-missing", {
        startAt: "2026-05-02T12:00:00.000Z",
        endAt: "2026-05-02T18:00:00.000Z"
      }),
    NotFoundException
  );
});

test("createRoomClosure rejects invalid interval ordering", async () => {
  const repository = createInMemoryClosuresRepository();
  const service = new ClosuresService(repository as never);

  await assert.rejects(
    () =>
      service.createRoomClosure("owner-1", "room-1", {
        startAt: "2026-05-02T18:00:00.000Z",
        endAt: "2026-05-02T12:00:00.000Z"
      }),
    BadRequestException
  );
});

function createInMemoryClosuresRepository() {
  const roomIds = new Set(["room-1"]);
  const tableIds = new Set(["table-1"]);
  let roomCounter = 1;
  let tableCounter = 1;
  const roomClosures = new Map<string, RoomClosureRecord>();
  const tableClosures = new Map<string, TableClosureRecord>();

  return {
    async roomExists(roomId: string): Promise<boolean> {
      return roomIds.has(roomId);
    },

    async tableExists(tableId: string): Promise<boolean> {
      return tableIds.has(tableId);
    },

    async createRoomClosure(
      roomId: string,
      input: {
        createdByUserId: string | null;
        endAt: Date;
        reason: string | null;
        startAt: Date;
      }
    ): Promise<RoomClosureRecord> {
      const record: RoomClosureRecord = {
        endAt: input.endAt,
        id: `room-closure-${roomCounter++}`,
        reason: input.reason,
        roomId,
        startAt: input.startAt
      };
      roomClosures.set(record.id, record);
      return { ...record };
    },

    async createTableClosure(
      tableId: string,
      input: {
        createdByUserId: string | null;
        endAt: Date;
        reason: string | null;
        startAt: Date;
      }
    ): Promise<TableClosureRecord> {
      const record: TableClosureRecord = {
        endAt: input.endAt,
        id: `table-closure-${tableCounter++}`,
        reason: input.reason,
        startAt: input.startAt,
        tableId
      };
      tableClosures.set(record.id, record);
      return { ...record };
    }
  };
}

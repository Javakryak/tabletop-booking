import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { TablesService } from "../src/rooms/tables.service.js";

type TableRecord = {
  capacity: number;
  id: string;
  isActive: boolean;
  number: string;
  roomId: string;
  sortOrder: number;
};

test("getActiveTablesByRoom returns only active tables from the requested room", async () => {
  const repository = createInMemoryTablesRepository();
  const service = new TablesService(repository as never);

  const result = await service.getActiveTablesByRoom("room-1");

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0]?.id, "table-1");
  assert.equal(result.data[0]?.roomId, "room-1");
  assert.equal(result.data[0]?.isActive, true);
});

test("createTable creates table for an existing room", async () => {
  const repository = createInMemoryTablesRepository();
  const service = new TablesService(repository as never);

  const result = await service.createTable({
    capacity: 8,
    isActive: true,
    number: "T3",
    roomId: "room-1",
    sortOrder: 10
  });

  assert.equal(result.data.id, "table-3");
  assert.equal(result.data.number, "T3");
  assert.equal(result.data.capacity, 8);
});

test("createTable rejects duplicate number in the same room", async () => {
  const repository = createInMemoryTablesRepository();
  const service = new TablesService(repository as never);

  await assert.rejects(
    () =>
      service.createTable({
        capacity: 4,
        number: "T1",
        roomId: "room-1"
      }),
    ConflictException
  );
});

test("updateTable rejects empty body", async () => {
  const repository = createInMemoryTablesRepository();
  const service = new TablesService(repository as never);

  await assert.rejects(() => service.updateTable("table-1", {}), BadRequestException);
});

test("updateTable rejects reassignment to unknown room", async () => {
  const repository = createInMemoryTablesRepository();
  const service = new TablesService(repository as never);

  await assert.rejects(
    () =>
      service.updateTable("table-1", {
        roomId: "room-404"
      }),
    NotFoundException
  );
});

test("deleteTable deactivates table without removing record", async () => {
  const repository = createInMemoryTablesRepository();
  const service = new TablesService(repository as never);

  const result = await service.deleteTable("table-1");

  assert.equal(result.data.id, "table-1");
  assert.equal(result.data.isActive, false);
  const stored = await repository.findTableByIdForTests("table-1");
  assert.ok(stored);
  assert.equal(stored.isActive, false);
});

function createInMemoryTablesRepository() {
  const roomIds = new Set<string>(["room-1", "room-2"]);
  const byId = new Map<string, TableRecord>([
    [
      "table-1",
      {
        capacity: 6,
        id: "table-1",
        isActive: true,
        number: "T1",
        roomId: "room-1",
        sortOrder: 0
      }
    ],
    [
      "table-2",
      {
        capacity: 4,
        id: "table-2",
        isActive: false,
        number: "T2",
        roomId: "room-1",
        sortOrder: 1
      }
    ]
  ]);

  return {
    async findTableByIdForTests(tableId: string): Promise<TableRecord | null> {
      const table = byId.get(tableId);
      return table ? { ...table } : null;
    },

    async listActiveTablesByRoom(roomId: string): Promise<TableRecord[]> {
      return [...byId.values()]
        .filter((table) => table.roomId === roomId && table.isActive)
        .sort(
          (left, right) =>
            left.sortOrder - right.sortOrder || left.number.localeCompare(right.number)
        )
        .map((table) => ({ ...table }));
    },

    async roomExists(roomId: string): Promise<boolean> {
      return roomIds.has(roomId);
    },

    async createTable(input: {
      capacity: number;
      isActive?: boolean;
      number: string;
      roomId: string;
      sortOrder?: number;
    }): Promise<TableRecord> {
      const duplicate = [...byId.values()].some(
        (table) => table.roomId === input.roomId && table.number === input.number
      );
      if (duplicate) {
        throw {
          code: "P2002",
          meta: {
            target: ["roomId", "number"]
          }
        };
      }

      const next: TableRecord = {
        capacity: input.capacity,
        id: "table-3",
        isActive: input.isActive ?? true,
        number: input.number,
        roomId: input.roomId,
        sortOrder: input.sortOrder ?? 0
      };
      byId.set(next.id, next);

      return { ...next };
    },

    async updateTable(
      tableId: string,
      input: {
        capacity?: number;
        isActive?: boolean;
        number?: string;
        roomId?: string;
        sortOrder?: number;
      }
    ): Promise<TableRecord | null> {
      const existing = byId.get(tableId);
      if (!existing) {
        return null;
      }

      const updatedRoomId = input.roomId ?? existing.roomId;
      const updatedNumber = input.number ?? existing.number;
      const duplicate = [...byId.values()].some(
        (table) =>
          table.id !== tableId && table.roomId === updatedRoomId && table.number === updatedNumber
      );
      if (duplicate) {
        throw {
          code: "P2002",
          meta: {
            target: ["roomId", "number"]
          }
        };
      }

      const updated: TableRecord = {
        ...existing,
        capacity: input.capacity ?? existing.capacity,
        isActive: input.isActive ?? existing.isActive,
        number: input.number ?? existing.number,
        roomId: updatedRoomId,
        sortOrder: input.sortOrder ?? existing.sortOrder
      };
      byId.set(tableId, updated);
      return { ...updated };
    },

    async deactivateTable(tableId: string): Promise<TableRecord | null> {
      const existing = byId.get(tableId);
      if (!existing) {
        return null;
      }

      const updated: TableRecord = {
        ...existing,
        isActive: false
      };
      byId.set(tableId, updated);
      return { ...updated };
    }
  };
}

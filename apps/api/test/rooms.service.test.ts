import { BadRequestException, NotFoundException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RoomsService } from "../src/rooms/rooms.service.js";

type RoomRecord = {
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
};

test("getActiveRooms returns only active room payload", async () => {
  const repository = createInMemoryRoomsRepository();
  const service = new RoomsService(repository as never);

  const result = await service.getActiveRooms();

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0]?.id, "room-1");
  assert.equal(result.data[0]?.name, "Main hall");
  assert.equal(result.data[0]?.isActive, true);
});

test("createRoom creates room with provided fields", async () => {
  const repository = createInMemoryRoomsRepository();
  const service = new RoomsService(repository as never);

  const result = await service.createRoom({
    description: "Large room",
    isActive: true,
    name: "New room",
    sortOrder: 10
  });

  assert.equal(result.data.name, "New room");
  assert.equal(result.data.description, "Large room");
  assert.equal(result.data.sortOrder, 10);
});

test("updateRoom rejects empty body", async () => {
  const repository = createInMemoryRoomsRepository();
  const service = new RoomsService(repository as never);

  await assert.rejects(() => service.updateRoom("room-1", {}), BadRequestException);
});

test("updateRoom rejects missing room", async () => {
  const repository = createInMemoryRoomsRepository();
  const service = new RoomsService(repository as never);

  await assert.rejects(
    () =>
      service.updateRoom("room-404", {
        name: "Updated"
      }),
    NotFoundException
  );
});

test("deleteRoom deactivates room without removing it", async () => {
  const repository = createInMemoryRoomsRepository();
  const service = new RoomsService(repository as never);

  const result = await service.deleteRoom("room-1");

  assert.equal(result.data.id, "room-1");
  assert.equal(result.data.isActive, false);
  const room = await repository.findRoomByIdForTests("room-1");
  assert.ok(room);
  assert.equal(room.isActive, false);
});

function createInMemoryRoomsRepository() {
  const byId = new Map<string, RoomRecord>([
    [
      "room-1",
      {
        description: "Main game area",
        id: "room-1",
        isActive: true,
        name: "Main hall",
        sortOrder: 0
      }
    ],
    [
      "room-2",
      {
        description: null,
        id: "room-2",
        isActive: false,
        name: "Archive",
        sortOrder: 99
      }
    ]
  ]);

  return {
    async findRoomByIdForTests(roomId: string): Promise<RoomRecord | null> {
      const room = byId.get(roomId);
      return room ? { ...room } : null;
    },

    async listActiveRooms(): Promise<RoomRecord[]> {
      return [...byId.values()]
        .filter((room) => room.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
        .map((room) => ({ ...room }));
    },

    async createRoom(input: {
      description?: string | null;
      isActive?: boolean;
      name: string;
      sortOrder?: number;
    }): Promise<RoomRecord> {
      const next: RoomRecord = {
        description: input.description ?? null,
        id: "room-3",
        isActive: input.isActive ?? true,
        name: input.name,
        sortOrder: input.sortOrder ?? 0
      };

      byId.set(next.id, next);
      return { ...next };
    },

    async updateRoom(
      roomId: string,
      input: {
        description?: string | null;
        isActive?: boolean;
        name?: string;
        sortOrder?: number;
      }
    ): Promise<RoomRecord | null> {
      const existing = byId.get(roomId);
      if (!existing) {
        return null;
      }

      const updated: RoomRecord = {
        ...existing,
        description: input.description !== undefined ? input.description : existing.description,
        isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
        name: input.name !== undefined ? input.name : existing.name,
        sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder
      };
      byId.set(roomId, updated);
      return { ...updated };
    },

    async deactivateRoom(roomId: string): Promise<RoomRecord | null> {
      const existing = byId.get(roomId);
      if (!existing) {
        return null;
      }

      const updated: RoomRecord = {
        ...existing,
        isActive: false
      };
      byId.set(roomId, updated);
      return { ...updated };
    }
  };
}

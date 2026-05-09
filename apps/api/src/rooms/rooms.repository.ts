import { Injectable } from "@nestjs/common";

import { databaseClient } from "../database.js";

export type RoomRecord = {
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
};

export type CreateRoomInput = {
  description?: string | null;
  isActive?: boolean;
  name: string;
  sortOrder?: number;
};

export type UpdateRoomInput = {
  description?: string | null;
  isActive?: boolean;
  name?: string;
  sortOrder?: number;
};

const roomSelect = {
  description: true,
  id: true,
  isActive: true,
  name: true,
  sortOrder: true
} as const;

@Injectable()
export class RoomsRepository {
  async listActiveRooms(): Promise<RoomRecord[]> {
    return await databaseClient.room.findMany({
      where: {
        isActive: true
      },
      select: roomSelect,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async createRoom(input: CreateRoomInput): Promise<RoomRecord> {
    const data: {
      description?: string | null;
      isActive?: boolean;
      name: string;
      sortOrder?: number;
    } = {
      name: input.name
    };
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }
    if (input.sortOrder !== undefined) {
      data.sortOrder = input.sortOrder;
    }

    return await databaseClient.room.create({
      data,
      select: roomSelect
    });
  }

  async updateRoom(roomId: string, input: UpdateRoomInput): Promise<RoomRecord | null> {
    const existing = await this.findRoomById(roomId);
    if (!existing) {
      return null;
    }

    const data = buildRoomUpdateData(input);
    if (Object.keys(data).length === 0) {
      return existing;
    }

    return await databaseClient.room.update({
      where: {
        id: roomId
      },
      data,
      select: roomSelect
    });
  }

  async deactivateRoom(roomId: string): Promise<RoomRecord | null> {
    const existing = await this.findRoomById(roomId);
    if (!existing) {
      return null;
    }

    if (!existing.isActive) {
      return existing;
    }

    return await databaseClient.room.update({
      where: {
        id: roomId
      },
      data: {
        isActive: false
      },
      select: roomSelect
    });
  }

  private async findRoomById(roomId: string): Promise<RoomRecord | null> {
    return await databaseClient.room.findUnique({
      where: {
        id: roomId
      },
      select: roomSelect
    });
  }
}

function buildRoomUpdateData(input: UpdateRoomInput): UpdateRoomInput {
  const data: UpdateRoomInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.sortOrder !== undefined) {
    data.sortOrder = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  return data;
}

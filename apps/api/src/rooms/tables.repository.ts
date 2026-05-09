import { Injectable } from "@nestjs/common";

import { databaseClient } from "../database.js";

export type TableRecord = {
  capacity: number;
  id: string;
  isActive: boolean;
  number: string;
  roomId: string;
  sortOrder: number;
};

export type CreateTableInput = {
  capacity: number;
  isActive?: boolean;
  number: string;
  roomId: string;
  sortOrder?: number;
};

export type UpdateTableInput = {
  capacity?: number;
  isActive?: boolean;
  number?: string;
  roomId?: string;
  sortOrder?: number;
};

const tableSelect = {
  capacity: true,
  id: true,
  isActive: true,
  number: true,
  roomId: true,
  sortOrder: true
} as const;

@Injectable()
export class TablesRepository {
  async listActiveTablesByRoom(roomId: string): Promise<TableRecord[]> {
    return await databaseClient.clubTable.findMany({
      where: {
        isActive: true,
        room: {
          isActive: true
        },
        roomId
      },
      select: tableSelect,
      orderBy: [{ sortOrder: "asc" }, { number: "asc" }]
    });
  }

  async roomExists(roomId: string): Promise<boolean> {
    const room = await databaseClient.room.findUnique({
      where: {
        id: roomId
      },
      select: {
        id: true
      }
    });

    return Boolean(room);
  }

  async createTable(input: CreateTableInput): Promise<TableRecord> {
    const data: {
      capacity: number;
      isActive?: boolean;
      number: string;
      roomId: string;
      sortOrder?: number;
    } = {
      capacity: input.capacity,
      number: input.number,
      roomId: input.roomId
    };
    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }
    if (input.sortOrder !== undefined) {
      data.sortOrder = input.sortOrder;
    }

    return await databaseClient.clubTable.create({
      data,
      select: tableSelect
    });
  }

  async updateTable(tableId: string, input: UpdateTableInput): Promise<TableRecord | null> {
    const existing = await this.findTableById(tableId);
    if (!existing) {
      return null;
    }

    const data = buildTableUpdateData(input);
    if (Object.keys(data).length === 0) {
      return existing;
    }

    return await databaseClient.clubTable.update({
      where: {
        id: tableId
      },
      data,
      select: tableSelect
    });
  }

  async deactivateTable(tableId: string): Promise<TableRecord | null> {
    const existing = await this.findTableById(tableId);
    if (!existing) {
      return null;
    }

    if (!existing.isActive) {
      return existing;
    }

    return await databaseClient.clubTable.update({
      where: {
        id: tableId
      },
      data: {
        isActive: false
      },
      select: tableSelect
    });
  }

  private async findTableById(tableId: string): Promise<TableRecord | null> {
    return await databaseClient.clubTable.findUnique({
      where: {
        id: tableId
      },
      select: tableSelect
    });
  }
}

function buildTableUpdateData(input: UpdateTableInput): UpdateTableInput {
  const data: UpdateTableInput = {};

  if (input.roomId !== undefined) {
    data.roomId = input.roomId;
  }
  if (input.number !== undefined) {
    data.number = input.number;
  }
  if (input.capacity !== undefined) {
    data.capacity = input.capacity;
  }
  if (input.sortOrder !== undefined) {
    data.sortOrder = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  return data;
}

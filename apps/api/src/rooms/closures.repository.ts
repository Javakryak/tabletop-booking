import { Injectable } from "@nestjs/common";

import { databaseClient } from "../database.js";

export type RoomClosureRecord = {
  endAt: Date;
  id: string;
  reason: string | null;
  roomId: string;
  startAt: Date;
};

export type TableClosureRecord = {
  endAt: Date;
  id: string;
  reason: string | null;
  startAt: Date;
  tableId: string;
};

export type CreateClosureInput = {
  createdByUserId: string | null;
  endAt: Date;
  reason: string | null;
  startAt: Date;
};

const roomClosureSelect = {
  endAt: true,
  id: true,
  reason: true,
  roomId: true,
  startAt: true
} as const;

const tableClosureSelect = {
  endAt: true,
  id: true,
  reason: true,
  startAt: true,
  tableId: true
} as const;

@Injectable()
export class ClosuresRepository {
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

  async tableExists(tableId: string): Promise<boolean> {
    const table = await databaseClient.clubTable.findUnique({
      where: {
        id: tableId
      },
      select: {
        id: true
      }
    });

    return Boolean(table);
  }

  async createRoomClosure(roomId: string, input: CreateClosureInput): Promise<RoomClosureRecord> {
    return await databaseClient.roomClosure.create({
      data: {
        createdByUserId: input.createdByUserId,
        endAt: input.endAt,
        reason: input.reason,
        roomId,
        startAt: input.startAt
      },
      select: roomClosureSelect
    });
  }

  async createTableClosure(
    tableId: string,
    input: CreateClosureInput
  ): Promise<TableClosureRecord> {
    return await databaseClient.tableClosure.create({
      data: {
        createdByUserId: input.createdByUserId,
        endAt: input.endAt,
        reason: input.reason,
        startAt: input.startAt,
        tableId
      },
      select: tableClosureSelect
    });
  }

  async listRoomClosuresOverlapping(
    roomId: string,
    startAt: Date,
    endAt: Date
  ): Promise<RoomClosureRecord[]> {
    return await databaseClient.roomClosure.findMany({
      where: {
        roomId,
        startAt: {
          lt: endAt
        },
        endAt: {
          gt: startAt
        }
      },
      select: roomClosureSelect,
      orderBy: {
        startAt: "asc"
      }
    });
  }

  async listTableClosuresOverlapping(
    tableId: string,
    startAt: Date,
    endAt: Date
  ): Promise<TableClosureRecord[]> {
    return await databaseClient.tableClosure.findMany({
      where: {
        tableId,
        startAt: {
          lt: endAt
        },
        endAt: {
          gt: startAt
        }
      },
      select: tableClosureSelect,
      orderBy: {
        startAt: "asc"
      }
    });
  }
}

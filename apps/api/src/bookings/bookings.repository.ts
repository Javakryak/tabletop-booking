import { Injectable } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { databaseClient } from "../database.js";

export type BookingAvailabilityRoomRecord = {
  id: string;
  name: string;
  sortOrder: number;
  tables: BookingAvailabilityTableRecord[];
};

export type BookingAvailabilityTableRecord = {
  capacity: number;
  id: string;
  number: string;
  sortOrder: number;
};

export type ScheduleSourceRecord = {
  closesAt: Date | null;
  isClosed: boolean;
  opensAt: Date | null;
};

export type RoomClosureRangeRecord = {
  endAt: Date;
  roomId: string;
  startAt: Date;
};

export type TableClosureRangeRecord = {
  endAt: Date;
  startAt: Date;
  tableId: string;
};

export type ActiveBookingRangeRecord = {
  endAt: Date;
  startAt: Date;
  tableId: string;
};

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.pending, BookingStatus.confirmed];

@Injectable()
export class BookingsRepository {
  async findSlotStepMinutes(): Promise<number | null> {
    const activeRule = await databaseClient.bookingRule.findFirst({
      where: {
        isActive: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      select: {
        slotStepMinutes: true
      }
    });

    return activeRule?.slotStepMinutes ?? null;
  }

  async findScheduleExceptionByDate(date: Date): Promise<ScheduleSourceRecord | null> {
    return await databaseClient.scheduleException.findUnique({
      where: {
        date
      },
      select: {
        closesAt: true,
        isClosed: true,
        opensAt: true
      }
    });
  }

  async findWeeklyWorkingHour(dayOfWeek: number): Promise<ScheduleSourceRecord | null> {
    return await databaseClient.clubWorkingHour.findUnique({
      where: {
        dayOfWeek
      },
      select: {
        closesAt: true,
        isClosed: true,
        opensAt: true
      }
    });
  }

  async listActiveRoomsWithTables(filters: {
    partySize?: number;
    roomId?: string;
  }): Promise<BookingAvailabilityRoomRecord[]> {
    const roomWhere: Prisma.RoomWhereInput = {
      isActive: true
    };
    if (filters.roomId !== undefined) {
      roomWhere.id = filters.roomId;
    }

    const tableWhere: Prisma.ClubTableWhereInput = {
      isActive: true
    };
    if (filters.partySize !== undefined) {
      tableWhere.capacity = {
        gte: filters.partySize
      };
    }

    const rooms = await databaseClient.room.findMany({
      where: roomWhere,
      select: {
        id: true,
        name: true,
        sortOrder: true,
        tables: {
          where: tableWhere,
          select: {
            capacity: true,
            id: true,
            number: true,
            sortOrder: true
          },
          orderBy: [{ sortOrder: "asc" }, { number: "asc" }]
        }
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      sortOrder: room.sortOrder,
      tables: room.tables.map((table) => ({
        capacity: table.capacity,
        id: table.id,
        number: table.number,
        sortOrder: table.sortOrder
      }))
    }));
  }

  async listRoomClosuresOverlapping(
    roomIds: string[],
    startAt: Date,
    endAt: Date
  ): Promise<RoomClosureRangeRecord[]> {
    if (roomIds.length === 0) {
      return [];
    }

    return await databaseClient.roomClosure.findMany({
      where: {
        roomId: {
          in: roomIds
        },
        startAt: {
          lt: endAt
        },
        endAt: {
          gt: startAt
        }
      },
      select: {
        endAt: true,
        roomId: true,
        startAt: true
      }
    });
  }

  async listTableClosuresOverlapping(
    tableIds: string[],
    startAt: Date,
    endAt: Date
  ): Promise<TableClosureRangeRecord[]> {
    if (tableIds.length === 0) {
      return [];
    }

    return await databaseClient.tableClosure.findMany({
      where: {
        tableId: {
          in: tableIds
        },
        startAt: {
          lt: endAt
        },
        endAt: {
          gt: startAt
        }
      },
      select: {
        endAt: true,
        startAt: true,
        tableId: true
      }
    });
  }

  async listActiveBookingsOverlapping(
    tableIds: string[],
    startAt: Date,
    endAt: Date
  ): Promise<ActiveBookingRangeRecord[]> {
    if (tableIds.length === 0) {
      return [];
    }

    return await databaseClient.booking.findMany({
      where: {
        tableId: {
          in: tableIds
        },
        status: {
          in: ACTIVE_BOOKING_STATUSES
        },
        startAt: {
          lt: endAt
        },
        endAt: {
          gt: startAt
        }
      },
      select: {
        endAt: true,
        startAt: true,
        tableId: true
      }
    });
  }
}

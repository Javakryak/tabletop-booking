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

export type BookingRuleRecord = {
  maxActiveBookingsPerUser: number;
  slotStepMinutes: number;
};

export type BookingUserRecord = {
  phone: string | null;
  status: "active" | "blocked" | "deleted";
};

export type ActiveTableRecord = {
  capacity: number;
  id: string;
  roomId: string;
};

export type CreatedBookingRecord = {
  comment: string | null;
  endAt: Date;
  id: string;
  startAt: Date;
  status: BookingStatus;
  tableId: string;
};

export type BookingStatusRecord = {
  id: string;
  status: BookingStatus;
};

export type CreatePendingBookingInput = {
  actorUserId: string;
  comment: string | null;
  endAt: Date;
  startAt: Date;
  tableId: string;
};

export type TransitionBookingStatusInput = {
  actorRole: "admin" | "owner" | "system" | "user";
  actorUserId: string | null;
  bookingId: string;
  fromStatus: BookingStatus;
  reason: string | null;
  toStatus: BookingStatus;
};

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.pending, BookingStatus.confirmed];

@Injectable()
export class BookingsRepository {
  async findActiveBookingRule(): Promise<BookingRuleRecord | null> {
    return await databaseClient.bookingRule.findFirst({
      where: {
        isActive: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      select: {
        maxActiveBookingsPerUser: true,
        slotStepMinutes: true
      }
    });
  }

  async findSlotStepMinutes(): Promise<number | null> {
    const activeRule = await this.findActiveBookingRule();
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

  async findBookingUserById(userId: string): Promise<BookingUserRecord | null> {
    const user = await databaseClient.user.findUnique({
      where: {
        id: userId
      },
      select: {
        profile: {
          select: {
            phone: true
          }
        },
        status: true
      }
    });
    if (!user) {
      return null;
    }

    return {
      phone: user.profile?.phone ?? null,
      status: user.status
    };
  }

  async findActiveTableById(tableId: string): Promise<ActiveTableRecord | null> {
    const table = await databaseClient.clubTable.findFirst({
      where: {
        id: tableId,
        isActive: true,
        room: {
          isActive: true
        }
      },
      select: {
        capacity: true,
        id: true,
        roomId: true
      }
    });

    return table;
  }

  async countActiveBookingsByUser(userId: string): Promise<number> {
    return await databaseClient.booking.count({
      where: {
        userId,
        status: {
          in: ACTIVE_BOOKING_STATUSES
        }
      }
    });
  }

  async hasOverlappingRoomClosure(roomId: string, startAt: Date, endAt: Date): Promise<boolean> {
    const closure = await databaseClient.roomClosure.findFirst({
      where: {
        roomId,
        startAt: {
          lt: endAt
        },
        endAt: {
          gt: startAt
        }
      },
      select: {
        id: true
      }
    });

    return Boolean(closure);
  }

  async hasOverlappingTableClosure(tableId: string, startAt: Date, endAt: Date): Promise<boolean> {
    const closure = await databaseClient.tableClosure.findFirst({
      where: {
        tableId,
        startAt: {
          lt: endAt
        },
        endAt: {
          gt: startAt
        }
      },
      select: {
        id: true
      }
    });

    return Boolean(closure);
  }

  async createPendingBooking(input: CreatePendingBookingInput): Promise<CreatedBookingRecord | null> {
    return await databaseClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const overlapping = await tx.booking.findFirst({
        where: {
          tableId: input.tableId,
          status: {
            in: ACTIVE_BOOKING_STATUSES
          },
          startAt: {
            lt: input.endAt
          },
          endAt: {
            gt: input.startAt
          }
        },
        select: {
          id: true
        }
      });
      if (overlapping) {
        return null;
      }

      const booking = await tx.booking.create({
        data: {
          comment: input.comment,
          endAt: input.endAt,
          startAt: input.startAt,
          status: BookingStatus.pending,
          tableId: input.tableId,
          userId: input.actorUserId
        },
        select: {
          comment: true,
          endAt: true,
          id: true,
          startAt: true,
          status: true,
          tableId: true
        }
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          changedByUserId: input.actorUserId,
          fromStatus: null,
          reason: "booking request created",
          toStatus: BookingStatus.pending
        }
      });

      await tx.auditLog.create({
        data: {
          action: "booking.request_created",
          actorUserId: input.actorUserId,
          entityId: booking.id,
          entityType: "booking",
          metadata: {
            signal: "admin_booking_follow_up",
            status: booking.status,
            tableId: booking.tableId
          }
        }
      });

      return booking;
    });
  }

  async findBookingStatusById(bookingId: string): Promise<BookingStatusRecord | null> {
    return await databaseClient.booking.findUnique({
      where: {
        id: bookingId
      },
      select: {
        id: true,
        status: true
      }
    });
  }

  async transitionBookingStatus(
    input: TransitionBookingStatusInput
  ): Promise<BookingStatusRecord | null> {
    return await databaseClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const updateResult = await tx.booking.updateMany({
        where: {
          id: input.bookingId,
          status: input.fromStatus
        },
        data: buildBookingStatusUpdateData(input)
      });
      if (updateResult.count === 0) {
        return null;
      }

      const updated = await tx.booking.findUnique({
        where: {
          id: input.bookingId
        },
        select: {
          id: true,
          status: true
        }
      });
      if (!updated) {
        return null;
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: updated.id,
          changedByUserId: input.actorUserId,
          fromStatus: input.fromStatus,
          reason: input.reason,
          toStatus: input.toStatus
        }
      });

      if (input.actorRole === "admin" || input.actorRole === "owner") {
        await tx.auditLog.create({
          data: {
            action: mapTransitionAction(input.toStatus),
            actorUserId: input.actorUserId,
            entityId: updated.id,
            entityType: "booking",
            metadata: {
              fromStatus: input.fromStatus,
              toStatus: input.toStatus
            }
          }
        });
      }

      return updated;
    });
  }
}

function buildBookingStatusUpdateData(
  input: TransitionBookingStatusInput
): Prisma.BookingUncheckedUpdateManyInput {
  const now = new Date();

  if (input.toStatus === BookingStatus.confirmed) {
    return {
      confirmedAt: now,
      confirmedByUserId: input.actorUserId,
      status: input.toStatus
    };
  }

  if (
    input.toStatus === BookingStatus.cancelled_by_user ||
    input.toStatus === BookingStatus.cancelled_by_admin
  ) {
    return {
      cancellationReason: input.reason,
      cancelledAt: now,
      cancelledByUserId: input.actorUserId,
      status: input.toStatus
    };
  }

  return {
    status: input.toStatus
  };
}

function mapTransitionAction(status: BookingStatus): string {
  if (status === BookingStatus.confirmed) {
    return "booking.confirmed";
  }

  if (status === BookingStatus.cancelled_by_user || status === BookingStatus.cancelled_by_admin) {
    return "booking.cancelled";
  }

  if (status === BookingStatus.completed) {
    return "booking.completed";
  }

  if (status === BookingStatus.expired) {
    return "booking.expired";
  }

  return "booking.status_updated";
}

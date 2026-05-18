import { Injectable } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { databaseClient } from "../database.js";

export type NotificationRequestLogRecord = {
  action: string;
  createdAt: Date;
  entityId: string | null;
  id: string;
  metadata: Prisma.JsonValue | null;
};

export type NotificationBookingContextRecord = {
  endAt: Date;
  id: string;
  roomName: string;
  startAt: Date;
  status: BookingStatus;
  tableNumber: string;
  userId: string;
};

export type UserTelegramRecord = {
  id: string;
  telegramId: string | null;
};

export type DeliveryAuditInput = {
  failureCode?: string;
  failureMessage?: string;
  notificationType: string;
  recipientUserId: string;
  requestId: string;
  status: "delivered" | "failed";
};

@Injectable()
export class InternalBotRepository {
  async listNotificationRequestLogs(limit: number): Promise<NotificationRequestLogRecord[]> {
    return await databaseClient.auditLog.findMany({
      where: {
        action: {
          in: ["booking.notification_requested", "booking.reminder_requested", "booking.request_created"]
        }
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        action: true,
        createdAt: true,
        entityId: true,
        id: true,
        metadata: true
      },
      take: limit
    });
  }

  async listBookingsByIds(bookingIds: string[]): Promise<NotificationBookingContextRecord[]> {
    if (bookingIds.length === 0) {
      return [];
    }

    const bookings = await databaseClient.booking.findMany({
      where: {
        id: {
          in: bookingIds
        }
      },
      select: {
        endAt: true,
        id: true,
        startAt: true,
        status: true,
        table: {
          select: {
            number: true,
            room: {
              select: {
                name: true
              }
            }
          }
        },
        userId: true
      }
    });

    return bookings.map((booking) => ({
      endAt: booking.endAt,
      id: booking.id,
      roomName: booking.table.room.name,
      startAt: booking.startAt,
      status: booking.status,
      tableNumber: booking.table.number,
      userId: booking.userId
    }));
  }

  async listUsersByIds(userIds: string[]): Promise<UserTelegramRecord[]> {
    if (userIds.length === 0) {
      return [];
    }

    return await databaseClient.user.findMany({
      where: {
        id: {
          in: userIds
        },
        status: {
          not: "deleted"
        }
      },
      select: {
        id: true,
        telegramId: true
      }
    });
  }

  async listAdminRecipients(): Promise<UserTelegramRecord[]> {
    return await databaseClient.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              in: ["admin", "owner"]
            }
          }
        },
        status: "active",
        telegramId: {
          not: null
        }
      },
      select: {
        id: true,
        telegramId: true
      }
    });
  }

  async listDeliveredNotificationKeys(keys: string[]): Promise<Set<string>> {
    if (keys.length === 0) {
      return new Set<string>();
    }

    const records = await databaseClient.auditLog.findMany({
      where: {
        action: "booking.notification_delivered",
        entityId: {
          in: keys
        },
        entityType: "booking_notification_delivery"
      },
      select: {
        entityId: true
      }
    });

    return new Set(records.map((record) => record.entityId).filter((value): value is string => Boolean(value)));
  }

  async writeNotificationDeliveryAudit(input: DeliveryAuditInput): Promise<void> {
    const entityId = buildDeliveryEntityId(input.requestId, input.recipientUserId);

    const metadata: Record<string, string> = {
      notificationType: input.notificationType,
      requestId: input.requestId,
      status: input.status
    };
    if (input.failureCode) {
      metadata.failureCode = input.failureCode;
    }
    if (input.failureMessage) {
      metadata.failureMessage = input.failureMessage;
    }

    await databaseClient.auditLog.create({
      data: {
        action: input.status === "delivered" ? "booking.notification_delivered" : "booking.notification_failed",
        actorUserId: input.recipientUserId,
        entityId,
        entityType: "booking_notification_delivery",
        metadata
      }
    });
  }

  async listConfirmedBookingsDueForReminder(input: {
    dueBefore: Date;
    now: Date;
  }): Promise<Array<{ bookingId: string; userId: string }>> {
    const rows = await databaseClient.booking.findMany({
      where: {
        startAt: {
          gt: input.now,
          lte: input.dueBefore
        },
        status: BookingStatus.confirmed
      },
      select: {
        id: true,
        userId: true
      },
      take: 200
    });

    return rows.map((row) => ({
      bookingId: row.id,
      userId: row.userId
    }));
  }

  async hasReminderRequest(reminderKey: string): Promise<boolean> {
    const existing = await databaseClient.auditLog.findFirst({
      where: {
        action: "booking.reminder_requested",
        entityId: reminderKey,
        entityType: "booking_notification"
      },
      select: {
        id: true
      }
    });

    return Boolean(existing);
  }

  async createReminderRequest(input: {
    bookingId: string;
    reminderKey: string;
    targetUserId: string;
  }): Promise<void> {
    await databaseClient.auditLog.create({
      data: {
        action: "booking.reminder_requested",
        actorUserId: null,
        entityId: input.reminderKey,
        entityType: "booking_notification",
        metadata: {
          bookingId: input.bookingId,
          signal: "booking_reminder_user_follow_up",
          targetUserId: input.targetUserId
        }
      }
    });
  }
}

export function buildDeliveryEntityId(requestId: string, recipientUserId: string): string {
  return `${requestId}:${recipientUserId}`;
}

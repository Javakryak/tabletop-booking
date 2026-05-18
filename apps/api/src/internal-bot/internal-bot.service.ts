import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { BookingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import {
  buildDeliveryEntityId,
  type DeliveryAuditInput,
  InternalBotRepository,
  type NotificationBookingContextRecord
} from "./internal-bot.repository.js";

type PendingNotificationRecord = {
  booking: {
    endAt: string;
    id: string;
    roomName: string;
    startAt: string;
    tableNumber: string;
  };
  notificationType:
    | "new_booking_request_admin"
    | "booking_confirmed_user"
    | "booking_cancelled_user"
    | "booking_moved_user"
    | "booking_reminder_user";
  recipientTelegramId: string;
  recipientUserId: string;
  requestId: string;
};

type ParsedNotificationRequest =
  | {
      bookingId: string;
      notificationType: "new_booking_request_admin";
      recipientUserId: string;
      requestId: string;
    }
  | {
      bookingId: string;
      notificationType:
        | "booking_confirmed_user"
        | "booking_cancelled_user"
        | "booking_moved_user"
        | "booking_reminder_user";
      recipientUserId: string;
      requestId: string;
    };

@Injectable()
export class InternalBotService {
  constructor(
    private readonly configService: ConfigService,
    private readonly repository: InternalBotRepository
  ) {}

  async listPendingBookingNotifications(limit: number): Promise<{ data: PendingNotificationRecord[] }> {
    await this.enqueueDueReminderRequests();

    const requestLogs = await this.repository.listNotificationRequestLogs(Math.max(limit * 8, 80));
    const adminRecipients = await this.repository.listAdminRecipients();
    const adminRecipientIds = adminRecipients.map((user) => user.id);

    const parsedRequests = requestLogs.flatMap((requestLog) =>
      parseNotificationRequest(requestLog, adminRecipientIds)
    );
    if (parsedRequests.length === 0) {
      return { data: [] };
    }

    const bookingIds = unique(parsedRequests.map((request) => request.bookingId));
    const userIds = unique(parsedRequests.map((request) => request.recipientUserId));
    const [bookings, users] = await Promise.all([
      this.repository.listBookingsByIds(bookingIds),
      this.repository.listUsersByIds(userIds)
    ]);
    const bookingById = new Map(bookings.map((booking) => [booking.id, booking] as const));
    const userById = new Map(users.map((user) => [user.id, user] as const));
    const adminRecipientById = new Map(adminRecipients.map((user) => [user.id, user] as const));

    const candidates: PendingNotificationRecord[] = [];
    for (const request of parsedRequests) {
      const booking = bookingById.get(request.bookingId);
      if (!booking) {
        continue;
      }

      const recipient =
        request.notificationType === "new_booking_request_admin"
          ? adminRecipientById.get(request.recipientUserId)
          : userById.get(request.recipientUserId);
      const recipientTelegramId = recipient?.telegramId?.trim();
      if (!recipientTelegramId) {
        continue;
      }

      candidates.push({
        booking: mapBookingContext(booking),
        notificationType: request.notificationType,
        recipientTelegramId,
        recipientUserId: request.recipientUserId,
        requestId: request.requestId
      });
    }

    const candidateKeys = unique(
      candidates.map((notification) =>
        buildDeliveryEntityId(notification.requestId, notification.recipientUserId)
      )
    );
    const deliveredKeys = await this.repository.listDeliveredNotificationKeys(candidateKeys);
    const pending = candidates.filter(
      (notification) =>
        !deliveredKeys.has(buildDeliveryEntityId(notification.requestId, notification.recipientUserId))
    );

    return {
      data: pending.slice(0, limit)
    };
  }

  async recordDeliveryAttempt(input: DeliveryAuditInput): Promise<void> {
    await this.repository.writeNotificationDeliveryAudit(input);
  }

  private async enqueueDueReminderRequests(): Promise<void> {
    const leadMinutes = resolveReminderLeadMinutes(this.configService.get<string>("BOT_REMINDER_LEAD_MINUTES"));
    const now = new Date();
    const dueBefore = new Date(now.getTime() + leadMinutes * 60_000);
    const dueBookings = await this.repository.listConfirmedBookingsDueForReminder({
      dueBefore,
      now
    });

    for (const booking of dueBookings) {
      const reminderKey = buildReminderKey(booking.bookingId, booking.userId);
      const exists = await this.repository.hasReminderRequest(reminderKey);
      if (exists) {
        continue;
      }

      await this.repository.createReminderRequest({
        bookingId: booking.bookingId,
        reminderKey,
        targetUserId: booking.userId
      });
    }
  }
}

function parseNotificationRequest(
  requestLog: {
    action: string;
    entityId: string | null;
    id: string;
    metadata: Prisma.JsonValue | null;
  },
  adminRecipientIds: string[]
): ParsedNotificationRequest[] {
  if (requestLog.action === "booking.request_created") {
    if (!requestLog.entityId) {
      return [];
    }

    return adminRecipientIds.map((recipientUserId) => ({
      bookingId: requestLog.entityId as string,
      notificationType: "new_booking_request_admin" as const,
      recipientUserId,
      requestId: requestLog.id
    }));
  }

  if (requestLog.action === "booking.notification_requested") {
    const metadata = asRecord(requestLog.metadata);
    const bookingId = requestLog.entityId;
    const targetUserId = asString(metadata?.targetUserId);
    const signal = asString(metadata?.signal);
    const notificationType = mapSignalToNotificationType(signal);

    if (!bookingId || !targetUserId || !notificationType) {
      return [];
    }

    return [
      {
        bookingId,
        notificationType,
        recipientUserId: targetUserId,
        requestId: requestLog.id
      }
    ];
  }

  if (requestLog.action === "booking.reminder_requested") {
    const metadata = asRecord(requestLog.metadata);
    const bookingId = asString(metadata?.bookingId);
    const targetUserId = asString(metadata?.targetUserId);
    if (!bookingId || !targetUserId) {
      return [];
    }

    return [
      {
        bookingId,
        notificationType: "booking_reminder_user",
        recipientUserId: targetUserId,
        requestId: requestLog.id
      }
    ];
  }

  return [];
}

function mapSignalToNotificationType(
  signal: string | null
):
  | "booking_confirmed_user"
  | "booking_cancelled_user"
  | "booking_moved_user"
  | "booking_reminder_user"
  | null {
  if (signal === "booking_confirmed_user_follow_up") {
    return "booking_confirmed_user";
  }
  if (signal === "booking_cancelled_user_follow_up") {
    return "booking_cancelled_user";
  }
  if (signal === "booking_moved_user_follow_up") {
    return "booking_moved_user";
  }
  if (signal === "booking_reminder_user_follow_up") {
    return "booking_reminder_user";
  }

  return null;
}

function mapBookingContext(booking: NotificationBookingContextRecord): {
  endAt: string;
  id: string;
  roomName: string;
  startAt: string;
  status: BookingStatus;
  tableNumber: string;
} {
  return {
    endAt: booking.endAt.toISOString(),
    id: booking.id,
    roomName: booking.roomName,
    startAt: booking.startAt.toISOString(),
    status: booking.status,
    tableNumber: booking.tableNumber
  };
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildReminderKey(bookingId: string, userId: string): string {
  return `${bookingId}:${userId}`;
}

function resolveReminderLeadMinutes(rawValue: string | undefined): number {
  if (!rawValue) {
    return 180;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 180;
  }

  return Math.min(parsed, 720);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

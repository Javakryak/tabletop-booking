import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BookingStatus } from "@prisma/client";

import { LegalService } from "../legal/legal.service.js";
import type { AdminBookingsQueryDto } from "./dto/admin-bookings.dto.js";
import type { UpdateBookingRulesDto } from "./dto/booking-rules.dto.js";
import type { CreateBookingRequestDto } from "./dto/create-booking.dto.js";
import type { GetBookingAvailabilityQueryDto } from "./dto/availability.dto.js";
import { BookingsRepository } from "./bookings.repository.js";

type TimeRange = {
  endAt: Date;
  startAt: Date;
};

type BookingAvailabilityResponse = {
  data: {
    date: string;
    rooms: Array<{
      id: string;
      name: string;
      tables: Array<{
        availableSlots: Array<{
          endAt: string;
          startAt: string;
        }>;
        capacity: number;
        id: string;
        number: string;
      }>;
    }>;
    slotMinutes: number;
  };
};

type BookingRequestResponse = {
  data: {
    comment: string | null;
    endAt: string;
    id: string;
    startAt: string;
    status: "pending";
    tableId: string;
  };
};

type BookingStatusTransitionResponse = {
  data: {
    bookingId: string;
    status: BookingStatus;
  };
};

type AdminBookingQueueResponse = {
  data: Array<{
    contact: {
      emailMasked: string | null;
      phoneMasked: string | null;
    };
    endAt: string;
    id: string;
    room: {
      id: string;
      name: string;
    };
    startAt: string;
    status: BookingStatus;
    table: {
      id: string;
      number: string;
    };
    user: {
      displayName: string;
      id: string;
      telegramUsername: string | null;
    };
  }>;
};

type TransitionActorRole = "admin" | "owner" | "system" | "user";

type BookingRulesResponse = {
  data: {
    allowFullDayBooking: boolean;
    maxActiveBookingsPerUser: number;
    minCancellationNoticeMinutes: number;
    slotMinutes: number;
  };
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly bookingsRepository: BookingsRepository,
    private readonly legalService: LegalService
  ) {}

  async getAvailability(query: GetBookingAvailabilityQueryDto): Promise<BookingAvailabilityResponse> {
    const date = parseDateOnly(query.date);
    const timezone = resolveScheduleTimezone(this.configService);

    const activeRule = await this.bookingsRepository.findActiveBookingRule();
    const slotMinutes = resolveSlotStepMinutes(activeRule?.slotStepMinutes ?? null);
    const durationMinutes = query.durationMinutes ?? slotMinutes;
    if (durationMinutes < slotMinutes || durationMinutes % slotMinutes !== 0) {
      throw new BadRequestException("durationMinutes must be a multiple of slotMinutes");
    }

    const schedule = await this.resolveScheduleForDate(date);
    if (schedule.isClosed || !schedule.opensAt || !schedule.closesAt) {
      return {
        data: {
          date: formatDate(date),
          rooms: [],
          slotMinutes
        }
      };
    }

    const opensAtMinutes = toMinutes(schedule.opensAt);
    const closesAtMinutes = toMinutes(schedule.closesAt);
    if (opensAtMinutes >= closesAtMinutes) {
      return {
        data: {
          date: formatDate(date),
          rooms: [],
          slotMinutes
        }
      };
    }

    const dayStartAt = toUtcDateForScheduleTime(date, opensAtMinutes, timezone);
    const dayEndAt = toUtcDateForScheduleTime(date, closesAtMinutes, timezone);

    const roomFilters: { partySize?: number; roomId?: string } = {};
    if (query.partySize !== undefined) {
      roomFilters.partySize = query.partySize;
    }
    if (query.roomId !== undefined) {
      roomFilters.roomId = query.roomId;
    }

    const rooms = await this.bookingsRepository.listActiveRoomsWithTables(roomFilters);

    const roomIds = rooms.map((room) => room.id);
    const tableIds = rooms.flatMap((room) => room.tables.map((table) => table.id));

    const [roomClosures, tableClosures, bookings] = await Promise.all([
      this.bookingsRepository.listRoomClosuresOverlapping(roomIds, dayStartAt, dayEndAt),
      this.bookingsRepository.listTableClosuresOverlapping(tableIds, dayStartAt, dayEndAt),
      this.bookingsRepository.listActiveBookingsOverlapping(tableIds, dayStartAt, dayEndAt)
    ]);

    const roomRanges = groupRangesByKey(roomClosures, (closure) => closure.roomId);
    const tableClosureRanges = groupRangesByKey(tableClosures, (closure) => closure.tableId);
    const bookingRanges = groupRangesByKey(bookings, (booking) => booking.tableId);

    const slotStepMs = slotMinutes * 60_000;
    const slotDurationMs = durationMinutes * 60_000;
    const dayStartMs = dayStartAt.getTime();
    const dayEndMs = dayEndAt.getTime();

    const responseRooms = rooms
      .map((room) => {
        const roomBlockedRanges = roomRanges.get(room.id) ?? [];

        const tables = room.tables
          .map((table) => {
            const blockedRanges = [
              ...roomBlockedRanges,
              ...(tableClosureRanges.get(table.id) ?? []),
              ...(bookingRanges.get(table.id) ?? [])
            ];

            const availableSlots = buildAvailableSlots({
              blockedRanges,
              dayEndMs,
              dayStartMs,
              slotDurationMs,
              slotStepMs
            });

            return {
              availableSlots,
              capacity: table.capacity,
              id: table.id,
              number: table.number
            };
          })
          .filter((table) => table.availableSlots.length > 0);

        return {
          id: room.id,
          name: room.name,
          tables
        };
      })
      .filter((room) => room.tables.length > 0);

    return {
      data: {
        date: formatDate(date),
        rooms: responseRooms,
        slotMinutes
      }
    };
  }

  async getBookingRules(): Promise<BookingRulesResponse> {
    const activeRule = await this.bookingsRepository.findActiveBookingRule();
    const normalized = normalizeBookingRules(activeRule);

    return {
      data: {
        allowFullDayBooking: normalized.allowFullDayBooking,
        maxActiveBookingsPerUser: normalized.maxActiveBookingsPerUser,
        minCancellationNoticeMinutes: normalized.minCancelBeforeMinutes,
        slotMinutes: normalized.slotStepMinutes
      }
    };
  }

  async updateBookingRules(actorUserId: string, body: UpdateBookingRulesDto): Promise<BookingRulesResponse> {
    if (body.slotMinutes !== 30) {
      throw new BadRequestException("slotMinutes must remain 30 in MVP");
    }

    const updated = await this.bookingsRepository.updateActiveBookingRules({
      actorUserId,
      allowFullDayBooking: body.allowFullDayBooking,
      maxActiveBookingsPerUser: body.maxActiveBookingsPerUser,
      minCancelBeforeMinutes: body.minCancellationNoticeMinutes,
      slotStepMinutes: body.slotMinutes
    });

    return {
      data: {
        allowFullDayBooking: updated.allowFullDayBooking,
        maxActiveBookingsPerUser: updated.maxActiveBookingsPerUser,
        minCancellationNoticeMinutes: updated.minCancelBeforeMinutes,
        slotMinutes: updated.slotStepMinutes
      }
    };
  }

  async getAdminBookings(query: AdminBookingsQueryDto): Promise<AdminBookingQueueResponse> {
    const filters: {
      status?: BookingStatus;
    } = {};
    const statusFilter = mapBookingStatusFilter(query.status);
    if (statusFilter !== undefined) {
      filters.status = statusFilter;
    }

    const bookings = await this.bookingsRepository.listAdminBookings(filters);

    return {
      data: bookings.map((booking) => ({
        contact: {
          emailMasked: maskEmail(booking.userEmail),
          phoneMasked: maskPhone(booking.userPhone)
        },
        endAt: booking.endAt.toISOString(),
        id: booking.id,
        room: {
          id: booking.roomId,
          name: booking.roomName
        },
        startAt: booking.startAt.toISOString(),
        status: booking.status,
        table: {
          id: booking.tableId,
          number: booking.tableNumber
        },
        user: {
          displayName: booking.userDisplayName,
          id: booking.userId,
          telegramUsername: booking.userTelegramUsername
        }
      }))
    };
  }

  async createBookingRequest(
    actorUserId: string,
    body: CreateBookingRequestDto
  ): Promise<BookingRequestResponse> {
    const timezone = resolveScheduleTimezone(this.configService);
    const startAt = parseIsoDateTime(body.startAt, "startAt");
    const endAt = parseIsoDateTime(body.endAt, "endAt");

    if (startAt.getTime() >= endAt.getTime()) {
      throw new BadRequestException("startAt must be earlier than endAt");
    }

    const startLocal = toZonedDateParts(startAt, timezone);
    const endLocal = toZonedDateParts(endAt, timezone);
    if (
      startLocal.year !== endLocal.year ||
      startLocal.month !== endLocal.month ||
      startLocal.day !== endLocal.day
    ) {
      throw new BadRequestException("Booking must start and end on the same calendar day");
    }

    const activeRule = await this.bookingsRepository.findActiveBookingRule();
    const slotMinutes = resolveSlotStepMinutes(activeRule?.slotStepMinutes ?? null);
    const maxActiveBookingsPerUser = resolveActiveBookingLimit(
      activeRule?.maxActiveBookingsPerUser ?? null
    );

    const startMinutes = startLocal.hour * 60 + startLocal.minute;
    const endMinutes = endLocal.hour * 60 + endLocal.minute;
    const durationMinutes = endMinutes - startMinutes;

    if (startMinutes % slotMinutes !== 0 || endMinutes % slotMinutes !== 0) {
      throw new BadRequestException("startAt and endAt must align with slot step");
    }
    if (durationMinutes <= 0 || durationMinutes % slotMinutes !== 0) {
      throw new BadRequestException("Requested duration must align with slot step");
    }

    const user = await this.bookingsRepository.findBookingUserById(actorUserId);
    if (!user) {
      throw new NotFoundException("Authenticated user was not found");
    }
    if (user.status !== "active") {
      throw new ForbiddenException("User account is not active");
    }
    if (!user.phone || user.phone.trim().length === 0) {
      throw new ForbiddenException("Phone number is required before creating a booking");
    }

    const hasRequiredConsents = await this.legalService.hasAcceptedRequiredConsents(actorUserId);
    if (!hasRequiredConsents) {
      throw new ForbiddenException("Required legal consents must be accepted before booking");
    }

    const table = await this.bookingsRepository.findActiveTableById(body.tableId);
    if (!table) {
      throw new NotFoundException("Table is not available");
    }

    const localDate = new Date(Date.UTC(startLocal.year, startLocal.month - 1, startLocal.day));
    const schedule = await this.resolveScheduleForDate(localDate);
    if (schedule.isClosed || !schedule.opensAt || !schedule.closesAt) {
      throw new ConflictException("The selected table is not available for this time range");
    }

    const opensAtMinutes = toMinutes(schedule.opensAt);
    const closesAtMinutes = toMinutes(schedule.closesAt);
    if (startMinutes < opensAtMinutes || endMinutes > closesAtMinutes) {
      throw new ConflictException("The selected table is not available for this time range");
    }

    const [activeBookingsCount, hasRoomClosure, hasTableClosure, overlappingBookings] =
      await Promise.all([
        this.bookingsRepository.countActiveBookingsByUser(actorUserId),
        this.bookingsRepository.hasOverlappingRoomClosure(table.roomId, startAt, endAt),
        this.bookingsRepository.hasOverlappingTableClosure(table.id, startAt, endAt),
        this.bookingsRepository.listActiveBookingsOverlapping([table.id], startAt, endAt)
      ]);

    if (activeBookingsCount >= maxActiveBookingsPerUser) {
      throw new ConflictException("Active booking limit was reached");
    }

    if (hasRoomClosure || hasTableClosure || overlappingBookings.length > 0) {
      throw new ConflictException("The selected table is not available for this time range");
    }

    const created = await this.bookingsRepository.createPendingBooking({
      actorUserId,
      comment: body.comment ?? null,
      endAt,
      startAt,
      tableId: table.id
    });
    if (!created) {
      throw new ConflictException("The selected table is not available for this time range");
    }

    return {
      data: {
        comment: created.comment,
        endAt: created.endAt.toISOString(),
        id: created.id,
        startAt: created.startAt.toISOString(),
        status: "pending",
        tableId: created.tableId
      }
    };
  }

  async transitionBookingStatus(input: {
    actorRole: TransitionActorRole;
    actorUserId: string | null;
    bookingId: string;
    reason?: string | null;
    toStatus: BookingStatus;
  }): Promise<BookingStatusTransitionResponse> {
    const existing = await this.bookingsRepository.findBookingStatusById(input.bookingId);
    if (!existing) {
      throw new NotFoundException("Booking was not found");
    }

    if (!isTransitionAllowed(existing.status, input.toStatus)) {
      throw new ConflictException(
        `Invalid booking status transition: ${existing.status} -> ${input.toStatus}`
      );
    }

    const updated = await this.bookingsRepository.transitionBookingStatus({
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      bookingId: input.bookingId,
      fromStatus: existing.status,
      reason: input.reason ?? null,
      toStatus: input.toStatus
    });
    if (!updated) {
      throw new ConflictException("Booking status changed concurrently. Retry the action.");
    }

    return {
      data: {
        bookingId: updated.id,
        status: updated.status
      }
    };
  }

  async adminConfirmBooking(input: {
    actorRole: "admin" | "owner";
    actorUserId: string;
    bookingId: string;
  }): Promise<BookingStatusTransitionResponse> {
    const booking = await this.bookingsRepository.findBookingForAdminAction(input.bookingId);
    if (!booking) {
      throw new NotFoundException("Booking was not found");
    }

    const hasConfirmedOverlap = await this.bookingsRepository.hasOverlappingConfirmedBooking({
      endAt: booking.endAt,
      excludeBookingId: booking.id,
      startAt: booking.startAt,
      tableId: booking.tableId
    });
    if (hasConfirmedOverlap) {
      throw new ConflictException("The selected table is not available for this time range");
    }

    const transitionResult = await this.transitionBookingStatus({
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      bookingId: input.bookingId,
      toStatus: BookingStatus.confirmed
    });

    await this.bookingsRepository.createBookingNotificationSignal({
      actorUserId: input.actorUserId,
      bookingId: booking.id,
      signal: "booking_confirmed_user_follow_up",
      targetUserId: booking.userId
    });

    return transitionResult;
  }

  async adminCancelBooking(input: {
    actorRole: "admin" | "owner";
    actorUserId: string;
    bookingId: string;
    reason?: string;
  }): Promise<BookingStatusTransitionResponse> {
    const booking = await this.bookingsRepository.findBookingForAdminAction(input.bookingId);
    if (!booking) {
      throw new NotFoundException("Booking was not found");
    }

    const transitionInput: {
      actorRole: TransitionActorRole;
      actorUserId: string | null;
      bookingId: string;
      reason?: string | null;
      toStatus: BookingStatus;
    } = {
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      bookingId: input.bookingId,
      toStatus: BookingStatus.cancelled_by_admin
    };
    if (input.reason !== undefined) {
      transitionInput.reason = input.reason;
    }

    const transitionResult = await this.transitionBookingStatus(transitionInput);

    await this.bookingsRepository.createBookingNotificationSignal({
      actorUserId: input.actorUserId,
      bookingId: booking.id,
      signal: "booking_cancelled_user_follow_up",
      targetUserId: booking.userId
    });

    return transitionResult;
  }

  async cancelOwnBooking(input: {
    actorUserId: string;
    bookingId: string;
    reason?: string;
  }): Promise<BookingStatusTransitionResponse> {
    const booking = await this.bookingsRepository.findBookingForAdminAction(input.bookingId);
    if (!booking) {
      throw new NotFoundException("Booking was not found");
    }

    if (booking.userId !== input.actorUserId) {
      throw new ForbiddenException("You can cancel only your own bookings");
    }

    if (!isUserCancellableStatus(booking.status)) {
      throw new ConflictException("Booking cannot be cancelled in current status");
    }

    const activeRule = await this.bookingsRepository.findActiveBookingRule();
    const minCancelBeforeMinutes = resolveMinCancelBeforeMinutes(
      activeRule?.minCancelBeforeMinutes ?? null
    );
    const minutesUntilStart = (booking.startAt.getTime() - Date.now()) / 60_000;
    if (minutesUntilStart < minCancelBeforeMinutes) {
      throw new ConflictException("Cancellation is too late according to club rules");
    }

    const transitionInput: {
      actorRole: TransitionActorRole;
      actorUserId: string | null;
      bookingId: string;
      reason?: string | null;
      toStatus: BookingStatus;
    } = {
      actorRole: "user",
      actorUserId: input.actorUserId,
      bookingId: input.bookingId,
      toStatus: BookingStatus.cancelled_by_user
    };
    if (input.reason !== undefined) {
      transitionInput.reason = input.reason;
    }

    return await this.transitionBookingStatus(transitionInput);
  }

  private async resolveScheduleForDate(date: Date): Promise<{
    closesAt: Date | null;
    isClosed: boolean;
    opensAt: Date | null;
  }> {
    const fromException = await this.bookingsRepository.findScheduleExceptionByDate(date);
    if (fromException) {
      return fromException;
    }

    const weeklyDay = resolveDayOfWeek(date);
    const fromWeeklySchedule = await this.bookingsRepository.findWeeklyWorkingHour(weeklyDay);
    if (!fromWeeklySchedule) {
      return {
        closesAt: null,
        isClosed: true,
        opensAt: null
      };
    }

    return fromWeeklySchedule;
  }
}

function buildAvailableSlots(input: {
  blockedRanges: TimeRange[];
  dayEndMs: number;
  dayStartMs: number;
  slotDurationMs: number;
  slotStepMs: number;
}): Array<{ endAt: string; startAt: string }> {
  const availableSlots: Array<{ endAt: string; startAt: string }> = [];

  for (
    let slotStart = input.dayStartMs;
    slotStart + input.slotDurationMs <= input.dayEndMs;
    slotStart += input.slotStepMs
  ) {
    const slotEnd = slotStart + input.slotDurationMs;

    const isBlocked = input.blockedRanges.some((range) =>
      rangesOverlap(slotStart, slotEnd, range.startAt.getTime(), range.endAt.getTime())
    );
    if (isBlocked) {
      continue;
    }

    availableSlots.push({
      endAt: new Date(slotEnd).toISOString(),
      startAt: new Date(slotStart).toISOString()
    });
  }

  return availableSlots;
}

function groupRangesByKey<T extends TimeRange>(
  records: T[],
  getKey: (value: T) => string
): Map<string, TimeRange[]> {
  const byKey = new Map<string, TimeRange[]>();

  for (const record of records) {
    const key = getKey(record);
    const current = byKey.get(key) ?? [];
    current.push({
      endAt: record.endAt,
      startAt: record.startAt
    });
    byKey.set(key, current);
  }

  return byKey;
}

function resolveScheduleTimezone(configService: ConfigService): string {
  const fromConfig = configService.get<string>("SCHEDULE_TIMEZONE");
  if (typeof fromConfig === "string" && fromConfig.trim().length > 0) {
    return fromConfig.trim();
  }

  return "Europe/Moscow";
}

function resolveSlotStepMinutes(value: number | null): number {
  if (Number.isInteger(value) && (value ?? 0) > 0) {
    return value as number;
  }

  return 30;
}

function resolveActiveBookingLimit(value: number | null): number {
  if (Number.isInteger(value) && (value ?? 0) > 0) {
    return value as number;
  }

  return 3;
}

function resolveMinCancelBeforeMinutes(value: number | null): number {
  if (Number.isInteger(value) && (value ?? 0) >= 0) {
    return value as number;
  }

  return 120;
}

function normalizeBookingRules(
  rule:
    | {
        allowFullDayBooking: boolean;
        maxActiveBookingsPerUser: number;
        minCancelBeforeMinutes: number;
        slotStepMinutes: number;
      }
    | null
): {
  allowFullDayBooking: boolean;
  maxActiveBookingsPerUser: number;
  minCancelBeforeMinutes: number;
  slotStepMinutes: number;
} {
  return {
    allowFullDayBooking: rule?.allowFullDayBooking ?? true,
    maxActiveBookingsPerUser: resolveActiveBookingLimit(
      rule?.maxActiveBookingsPerUser ?? null
    ),
    minCancelBeforeMinutes: resolveMinCancelBeforeMinutes(
      rule?.minCancelBeforeMinutes ?? null
    ),
    slotStepMinutes: resolveSlotStepMinutes(rule?.slotStepMinutes ?? null)
  };
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestException("date must be in YYYY-MM-DD format");
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  const day = Number.parseInt(match[3] ?? "", 10);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException("date must be a real calendar day");
  }

  return parsed;
}

function parseIsoDateTime(value: string, fieldName: string): Date {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid ISO datetime value`);
  }

  return parsed;
}

function formatDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function resolveDayOfWeek(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function toMinutes(value: Date): number {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

function toUtcDateForScheduleTime(date: Date, minutes: number, timezone: string): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return new Date(resolveZonedDateTimeEpoch(year, month, day, hour, minute, timezone));
}

function toZonedDateParts(
  date: Date,
  timezone: string
): { day: number; hour: number; minute: number; month: number; year: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  });

  const parts = formatter.formatToParts(date);

  const year = Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "", 10);
  const month = Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "", 10);
  const day = Number.parseInt(parts.find((part) => part.type === "day")?.value ?? "", 10);
  const hour = Number.parseInt(parts.find((part) => part.type === "hour")?.value ?? "", 10);
  const minute = Number.parseInt(parts.find((part) => part.type === "minute")?.value ?? "", 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    throw new BadRequestException("Failed to resolve booking time in schedule timezone");
  }

  return {
    day,
    hour,
    minute,
    month,
    year
  };
}

function resolveZonedDateTimeEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): number {
  const utcBase = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guess = utcBase;

  for (let index = 0; index < 4; index += 1) {
    const offsetMinutes = getOffsetMinutes(new Date(guess), timezone);
    const adjusted = utcBase - offsetMinutes * 60_000;

    if (adjusted === guess) {
      return adjusted;
    }

    guess = adjusted;
  }

  return guess;
}

function getOffsetMinutes(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "shortOffset"
  });

  const parts = formatter.formatToParts(date);
  const zonePart = parts.find((part) => part.type === "timeZoneName")?.value;
  if (!zonePart || zonePart === "GMT") {
    return 0;
  }

  const offsetMatch = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zonePart);
  if (!offsetMatch) {
    return 0;
  }

  const sign = offsetMatch[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(offsetMatch[2] ?? "0", 10);
  const minutes = Number.parseInt(offsetMatch[3] ?? "0", 10);

  return sign * (hours * 60 + minutes);
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

function isTransitionAllowed(fromStatus: BookingStatus, toStatus: BookingStatus): boolean {
  if (fromStatus === BookingStatus.pending) {
    return (
      toStatus === BookingStatus.confirmed ||
      toStatus === BookingStatus.cancelled_by_user ||
      toStatus === BookingStatus.cancelled_by_admin ||
      toStatus === BookingStatus.expired
    );
  }

  if (fromStatus === BookingStatus.confirmed) {
    return (
      toStatus === BookingStatus.cancelled_by_user ||
      toStatus === BookingStatus.cancelled_by_admin ||
      toStatus === BookingStatus.completed
    );
  }

  return false;
}

function isUserCancellableStatus(status: BookingStatus): boolean {
  return status === BookingStatus.pending || status === BookingStatus.confirmed;
}

function mapBookingStatusFilter(
  status:
    | "pending"
    | "confirmed"
    | "cancelled_by_user"
    | "cancelled_by_admin"
    | "completed"
    | "expired"
    | undefined
): BookingStatus | undefined {
  if (!status) {
    return undefined;
  }

  if (status === "pending") {
    return BookingStatus.pending;
  }
  if (status === "confirmed") {
    return BookingStatus.confirmed;
  }
  if (status === "cancelled_by_user") {
    return BookingStatus.cancelled_by_user;
  }
  if (status === "cancelled_by_admin") {
    return BookingStatus.cancelled_by_admin;
  }
  if (status === "completed") {
    return BookingStatus.completed;
  }

  return BookingStatus.expired;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 4) {
    return "***";
  }

  const head = digits[0] ?? "7";
  const tail = digits.slice(-2);
  return `+${head}*** *** **${tail}`;
}

function maskEmail(email: string | null): string | null {
  if (!email) {
    return null;
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }

  const first = localPart[0] ?? "*";
  return `${first}***@${domain}`;
}

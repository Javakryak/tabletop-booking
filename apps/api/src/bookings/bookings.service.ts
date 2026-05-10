import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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

@Injectable()
export class BookingsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly bookingsRepository: BookingsRepository
  ) {}

  async getAvailability(query: GetBookingAvailabilityQueryDto): Promise<BookingAvailabilityResponse> {
    const date = parseDateOnly(query.date);
    const timezone = resolveScheduleTimezone(this.configService);

    const slotMinutesFromRule = await this.bookingsRepository.findSlotStepMinutes();
    const slotMinutes =
      Number.isInteger(slotMinutesFromRule) && (slotMinutesFromRule ?? 0) > 0
        ? (slotMinutesFromRule as number)
        : 30;
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

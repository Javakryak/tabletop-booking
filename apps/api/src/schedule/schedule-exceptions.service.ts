import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type {
  CreateScheduleExceptionDto,
  ScheduleExceptionType,
  UpdateScheduleExceptionDto
} from "./dto/schedule-exceptions.dto.js";
import { ScheduleRepository } from "./schedule.repository.js";
import { ScheduleExceptionsRepository } from "./schedule-exceptions.repository.js";
import type { ScheduleExceptionRecord } from "./schedule-exceptions.repository.js";

type ScheduleExceptionResponseItem = {
  closesAt: string | null;
  date: string;
  id: string;
  isClosed: boolean;
  opensAt: string | null;
  reason: string | null;
  type: ScheduleExceptionType;
};

type ScheduleExceptionResponse = {
  data: ScheduleExceptionResponseItem;
};

type ScheduleExceptionsResponse = {
  data: ScheduleExceptionResponseItem[];
};

type EffectiveScheduleForDateResponse = {
  data: {
    closesAt: string | null;
    date: string;
    isClosed: boolean;
    opensAt: string | null;
    source: "exception" | "weekly" | "missing";
  };
};

@Injectable()
export class ScheduleExceptionsService {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly scheduleExceptionsRepository: ScheduleExceptionsRepository
  ) {}

  async listScheduleExceptions(): Promise<ScheduleExceptionsResponse> {
    const exceptions = await this.scheduleExceptionsRepository.listScheduleExceptions();

    return {
      data: exceptions.map(mapExceptionToResponse)
    };
  }

  async createScheduleException(
    actorUserId: string | null,
    body: CreateScheduleExceptionDto
  ): Promise<ScheduleExceptionResponse> {
    const parsed = normalizeExceptionPayload(body);

    try {
      const created = await this.scheduleExceptionsRepository.createScheduleException({
        closesAt: parsed.closesAt,
        createdByUserId: actorUserId,
        date: parsed.date,
        isClosed: parsed.isClosed,
        opensAt: parsed.opensAt,
        reason: parsed.reason
      });

      return {
        data: mapExceptionToResponse(created)
      };
    } catch (error: unknown) {
      throw mapPersistenceError(error);
    }
  }

  async updateScheduleException(
    exceptionId: string,
    body: UpdateScheduleExceptionDto
  ): Promise<ScheduleExceptionResponse> {
    const existing = await this.scheduleExceptionsRepository.findScheduleExceptionById(exceptionId);
    if (!existing) {
      throw new NotFoundException("Schedule exception was not found");
    }

    if (!hasAnyDefinedValue(body, ["type", "opensAt", "closesAt", "reason"])) {
      throw new BadRequestException("At least one schedule exception field must be provided");
    }

    const mergedPayload: CreateScheduleExceptionDto = {
      closesAt: body.closesAt ?? formatTime(existing.closesAt),
      date: formatDate(existing.date),
      opensAt: body.opensAt ?? formatTime(existing.opensAt),
      reason: body.reason ?? existing.reason,
      type: body.type ?? deriveType(existing)
    };
    const normalized = normalizeExceptionPayload(mergedPayload);

    const updated = await this.scheduleExceptionsRepository.updateScheduleException(exceptionId, {
      closesAt: normalized.closesAt,
      isClosed: normalized.isClosed,
      opensAt: normalized.opensAt,
      reason: normalized.reason
    });
    if (!updated) {
      throw new NotFoundException("Schedule exception was not found");
    }

    return {
      data: mapExceptionToResponse(updated)
    };
  }

  async deleteScheduleException(exceptionId: string): Promise<ScheduleExceptionResponse> {
    const deleted = await this.scheduleExceptionsRepository.deleteScheduleException(exceptionId);
    if (!deleted) {
      throw new NotFoundException("Schedule exception was not found");
    }

    return {
      data: mapExceptionToResponse(deleted)
    };
  }

  async getEffectiveScheduleForDate(date: string): Promise<EffectiveScheduleForDateResponse> {
    const parsedDate = parseDateOnly(date);
    const exception = await this.scheduleExceptionsRepository.findScheduleExceptionByDate(parsedDate);
    if (exception) {
      return {
        data: {
          closesAt: formatTime(exception.closesAt),
          date: formatDate(parsedDate),
          isClosed: exception.isClosed,
          opensAt: formatTime(exception.opensAt),
          source: "exception"
        }
      };
    }

    const weeklyHours = await this.scheduleRepository.listWorkingHours();
    const dayOfWeek = resolveDayOfWeek(parsedDate);
    const weekly = weeklyHours.find((entry) => entry.dayOfWeek === dayOfWeek);
    if (!weekly) {
      return {
        data: {
          closesAt: null,
          date: formatDate(parsedDate),
          isClosed: true,
          opensAt: null,
          source: "missing"
        }
      };
    }

    return {
      data: {
        closesAt: formatTime(weekly.closesAt),
        date: formatDate(parsedDate),
        isClosed: weekly.isClosed,
        opensAt: formatTime(weekly.opensAt),
        source: "weekly"
      }
    };
  }
}

function hasAnyDefinedValue<T extends object>(payload: T, keys: Array<keyof T>): boolean {
  return keys.some((key) => payload[key] !== undefined);
}

function normalizeExceptionPayload(body: CreateScheduleExceptionDto): {
  closesAt: Date | null;
  date: Date;
  isClosed: boolean;
  opensAt: Date | null;
  reason: string | null;
} {
  const date = parseDateOnly(body.date);

  if (body.type === "closed") {
    if (body.opensAt !== undefined && body.opensAt !== null) {
      throw new BadRequestException("opensAt must be null for closed exception type");
    }
    if (body.closesAt !== undefined && body.closesAt !== null) {
      throw new BadRequestException("closesAt must be null for closed exception type");
    }

    return {
      closesAt: null,
      date,
      isClosed: true,
      opensAt: null,
      reason: body.reason ?? null
    };
  }

  if (!body.opensAt || !body.closesAt) {
    throw new BadRequestException("opensAt and closesAt are required for non-closed exception types");
  }

  const opensAt = parseTime(body.opensAt);
  const closesAt = parseTime(body.closesAt);
  if (toMinutes(opensAt) >= toMinutes(closesAt)) {
    throw new BadRequestException("opensAt must be earlier than closesAt");
  }

  return {
    closesAt,
    date,
    isClosed: false,
    opensAt,
    reason: body.reason ?? null
  };
}

function mapExceptionToResponse(record: ScheduleExceptionRecord): ScheduleExceptionResponseItem {
  return {
    closesAt: formatTime(record.closesAt),
    date: formatDate(record.date),
    id: record.id,
    isClosed: record.isClosed,
    opensAt: formatTime(record.opensAt),
    reason: record.reason,
    type: deriveType(record)
  };
}

function deriveType(record: Pick<ScheduleExceptionRecord, "isClosed" | "opensAt" | "closesAt">): ScheduleExceptionType {
  if (record.isClosed) {
    return "closed";
  }

  const opensAtMinutes = record.opensAt ? toMinutes(record.opensAt) : null;
  const closesAtMinutes = record.closesAt ? toMinutes(record.closesAt) : null;
  if (opensAtMinutes !== null && closesAtMinutes !== null) {
    const duration = closesAtMinutes - opensAtMinutes;
    return duration < 12 * 60 ? "short_day" : "special_hours";
  }

  return "special_hours";
}

function mapPersistenceError(error: unknown): Error {
  const knownError = asPrismaKnownRequestError(error);
  if (
    knownError?.code === "P2002" &&
    Array.isArray(knownError.meta?.target) &&
    knownError.meta.target.includes("date")
  ) {
    return new ConflictException("Schedule exception already exists for this date");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unexpected persistence error");
}

function asPrismaKnownRequestError(
  error: unknown
): {
  code?: string;
  meta?: { target?: unknown };
} | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as { code?: unknown; meta?: unknown };
  if (typeof candidate.code !== "string") {
    return null;
  }

  const result: {
    code?: string;
    meta?: { target?: unknown };
  } = {
    code: candidate.code
  };
  if (candidate.meta && typeof candidate.meta === "object") {
    result.meta = candidate.meta as { target?: unknown };
  }

  return result;
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestException("date must be in YYYY-MM-DD format");
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  const day = Number.parseInt(match[3] ?? "", 10);

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException("date must be a valid calendar day");
  }

  return date;
}

function parseTime(value: string): Date {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new BadRequestException("Invalid time format");
  }

  const hours = Number.parseInt(match[1] ?? "", 10);
  const minutes = Number.parseInt(match[2] ?? "", 10);

  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

function toMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTime(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function resolveDayOfWeek(date: Date): number {
  const jsDay = date.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

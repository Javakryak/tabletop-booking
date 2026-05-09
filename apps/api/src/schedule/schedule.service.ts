import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  UpdateWorkingHourDayDto,
  UpdateWorkingHoursDto
} from "./dto/working-hours.dto.js";
import type { UpsertWorkingHourInput, WorkingHourRecord } from "./schedule.repository.js";
import { ScheduleRepository } from "./schedule.repository.js";

type WorkingHoursResponse = {
  data: {
    days: Array<{
      closesAt: string | null;
      dayOfWeek: number;
      isClosed: boolean;
      opensAt: string | null;
    }>;
    timezone: string;
  };
};

@Injectable()
export class ScheduleService {
  constructor(
    private readonly configService: ConfigService,
    private readonly scheduleRepository: ScheduleRepository
  ) {}

  async getWorkingHours(): Promise<WorkingHoursResponse> {
    const days = await this.scheduleRepository.listWorkingHours();

    return {
      data: {
        days: days.map(mapWorkingHourToResponse),
        timezone: resolveScheduleTimezone(this.configService)
      }
    };
  }

  async updateWorkingHours(body: UpdateWorkingHoursDto): Promise<WorkingHoursResponse> {
    const timezone = resolveScheduleTimezone(this.configService);
    if (body.timezone !== timezone) {
      throw new BadRequestException(`timezone must be ${timezone}`);
    }

    ensureUniqueDays(body.days);

    const upsertInput = body.days.map(mapDayToUpsertInput);
    await this.scheduleRepository.upsertWorkingHours(upsertInput);

    const days = await this.scheduleRepository.listWorkingHours();

    return {
      data: {
        days: days.map(mapWorkingHourToResponse),
        timezone
      }
    };
  }
}

function resolveScheduleTimezone(configService: ConfigService): string {
  const fromConfig = configService.get<string>("SCHEDULE_TIMEZONE");
  if (typeof fromConfig === "string" && fromConfig.trim().length > 0) {
    return fromConfig.trim();
  }

  return "Europe/Moscow";
}

function mapWorkingHourToResponse(day: WorkingHourRecord): {
  closesAt: string | null;
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null;
} {
  return {
    closesAt: day.closesAt ? formatTime(day.closesAt) : null,
    dayOfWeek: day.dayOfWeek,
    isClosed: day.isClosed,
    opensAt: day.opensAt ? formatTime(day.opensAt) : null
  };
}

function ensureUniqueDays(days: UpdateWorkingHourDayDto[]): void {
  const unique = new Set<number>();

  for (const day of days) {
    if (unique.has(day.dayOfWeek)) {
      throw new BadRequestException("days must not contain duplicate dayOfWeek values");
    }

    unique.add(day.dayOfWeek);
  }
}

function mapDayToUpsertInput(day: UpdateWorkingHourDayDto): UpsertWorkingHourInput {
  if (day.isClosed) {
    if (day.opensAt !== undefined && day.opensAt !== null) {
      throw new BadRequestException("opensAt must be null for closed days");
    }
    if (day.closesAt !== undefined && day.closesAt !== null) {
      throw new BadRequestException("closesAt must be null for closed days");
    }

    return {
      closesAt: null,
      dayOfWeek: day.dayOfWeek,
      isClosed: true,
      opensAt: null
    };
  }

  if (!day.opensAt || !day.closesAt) {
    throw new BadRequestException("opensAt and closesAt are required for open days");
  }

  const opensAt = parseTime(day.opensAt);
  const closesAt = parseTime(day.closesAt);
  if (toMinutes(opensAt) >= toMinutes(closesAt)) {
    throw new BadRequestException("opensAt must be earlier than closesAt");
  }

  return {
    closesAt,
    dayOfWeek: day.dayOfWeek,
    isClosed: false,
    opensAt
  };
}

function parseTime(value: string): Date {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number.parseInt(hoursRaw ?? "", 10);
  const minutes = Number.parseInt(minutesRaw ?? "", 10);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new BadRequestException("Invalid time format");
  }

  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

function toMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function formatTime(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

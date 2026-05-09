import { Injectable } from "@nestjs/common";

import { databaseClient } from "../database.js";

export type ScheduleExceptionRecord = {
  closesAt: Date | null;
  date: Date;
  id: string;
  isClosed: boolean;
  opensAt: Date | null;
  reason: string | null;
};

export type CreateScheduleExceptionInput = {
  closesAt: Date | null;
  createdByUserId: string | null;
  date: Date;
  isClosed: boolean;
  opensAt: Date | null;
  reason: string | null;
};

export type UpdateScheduleExceptionInput = {
  closesAt?: Date | null;
  isClosed?: boolean;
  opensAt?: Date | null;
  reason?: string | null;
};

const scheduleExceptionSelect = {
  closesAt: true,
  date: true,
  id: true,
  isClosed: true,
  opensAt: true,
  reason: true
} as const;

@Injectable()
export class ScheduleExceptionsRepository {
  async listScheduleExceptions(): Promise<ScheduleExceptionRecord[]> {
    return await databaseClient.scheduleException.findMany({
      select: scheduleExceptionSelect,
      orderBy: {
        date: "asc"
      }
    });
  }

  async findScheduleExceptionById(exceptionId: string): Promise<ScheduleExceptionRecord | null> {
    return await databaseClient.scheduleException.findUnique({
      where: {
        id: exceptionId
      },
      select: scheduleExceptionSelect
    });
  }

  async findScheduleExceptionByDate(date: Date): Promise<ScheduleExceptionRecord | null> {
    return await databaseClient.scheduleException.findUnique({
      where: {
        date
      },
      select: scheduleExceptionSelect
    });
  }

  async createScheduleException(
    input: CreateScheduleExceptionInput
  ): Promise<ScheduleExceptionRecord> {
    return await databaseClient.scheduleException.create({
      data: {
        closesAt: input.closesAt,
        createdByUserId: input.createdByUserId,
        date: input.date,
        isClosed: input.isClosed,
        opensAt: input.opensAt,
        reason: input.reason
      },
      select: scheduleExceptionSelect
    });
  }

  async updateScheduleException(
    exceptionId: string,
    input: UpdateScheduleExceptionInput
  ): Promise<ScheduleExceptionRecord | null> {
    const existing = await this.findScheduleExceptionById(exceptionId);
    if (!existing) {
      return null;
    }

    const data = buildUpdateData(input);
    if (Object.keys(data).length === 0) {
      return existing;
    }

    return await databaseClient.scheduleException.update({
      where: {
        id: exceptionId
      },
      data,
      select: scheduleExceptionSelect
    });
  }

  async deleteScheduleException(exceptionId: string): Promise<ScheduleExceptionRecord | null> {
    const existing = await this.findScheduleExceptionById(exceptionId);
    if (!existing) {
      return null;
    }

    return await databaseClient.scheduleException.delete({
      where: {
        id: exceptionId
      },
      select: scheduleExceptionSelect
    });
  }
}

function buildUpdateData(input: UpdateScheduleExceptionInput): UpdateScheduleExceptionInput {
  const data: UpdateScheduleExceptionInput = {};

  if (input.isClosed !== undefined) {
    data.isClosed = input.isClosed;
  }
  if (input.opensAt !== undefined) {
    data.opensAt = input.opensAt;
  }
  if (input.closesAt !== undefined) {
    data.closesAt = input.closesAt;
  }
  if (input.reason !== undefined) {
    data.reason = input.reason;
  }

  return data;
}

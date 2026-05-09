import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { databaseClient } from "../database.js";

export type WorkingHourRecord = {
  closesAt: Date | null;
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: Date | null;
};

export type UpsertWorkingHourInput = {
  closesAt: Date | null;
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: Date | null;
};

const workingHourSelect = {
  closesAt: true,
  dayOfWeek: true,
  isClosed: true,
  opensAt: true
} as const;

@Injectable()
export class ScheduleRepository {
  async listWorkingHours(): Promise<WorkingHourRecord[]> {
    return await databaseClient.clubWorkingHour.findMany({
      select: workingHourSelect,
      orderBy: {
        dayOfWeek: "asc"
      }
    });
  }

  async upsertWorkingHours(days: UpsertWorkingHourInput[]): Promise<void> {
    await databaseClient.$transaction(async (tx: Prisma.TransactionClient) => {
      await Promise.all(
        days.map(async (day) => {
          await tx.clubWorkingHour.upsert({
            where: {
              dayOfWeek: day.dayOfWeek
            },
            update: {
              closesAt: day.closesAt,
              isClosed: day.isClosed,
              opensAt: day.opensAt
            },
            create: {
              closesAt: day.closesAt,
              dayOfWeek: day.dayOfWeek,
              isClosed: day.isClosed,
              opensAt: day.opensAt
            }
          });
        })
      );
    });
  }
}

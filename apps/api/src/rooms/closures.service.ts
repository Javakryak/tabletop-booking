import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { CreateResourceClosureDto } from "./dto/closures.dto.js";
import { ClosuresRepository } from "./closures.repository.js";

type RoomClosureResponse = {
  data: {
    endAt: string;
    id: string;
    reason: string | null;
    roomId: string;
    startAt: string;
  };
};

type TableClosureResponse = {
  data: {
    endAt: string;
    id: string;
    reason: string | null;
    startAt: string;
    tableId: string;
  };
};

@Injectable()
export class ClosuresService {
  constructor(private readonly closuresRepository: ClosuresRepository) {}

  async createRoomClosure(
    actorUserId: string,
    roomId: string,
    body: CreateResourceClosureDto
  ): Promise<RoomClosureResponse> {
    const roomExists = await this.closuresRepository.roomExists(roomId);
    if (!roomExists) {
      throw new NotFoundException("Room was not found");
    }

    const interval = parseInterval(body.startAt, body.endAt);
    const created = await this.closuresRepository.createRoomClosure(roomId, {
      createdByUserId: actorUserId,
      endAt: interval.endAt,
      reason: body.reason ?? null,
      startAt: interval.startAt
    });

    return {
      data: {
        endAt: created.endAt.toISOString(),
        id: created.id,
        reason: created.reason,
        roomId: created.roomId,
        startAt: created.startAt.toISOString()
      }
    };
  }

  async createTableClosure(
    actorUserId: string,
    tableId: string,
    body: CreateResourceClosureDto
  ): Promise<TableClosureResponse> {
    const tableExists = await this.closuresRepository.tableExists(tableId);
    if (!tableExists) {
      throw new NotFoundException("Table was not found");
    }

    const interval = parseInterval(body.startAt, body.endAt);
    const created = await this.closuresRepository.createTableClosure(tableId, {
      createdByUserId: actorUserId,
      endAt: interval.endAt,
      reason: body.reason ?? null,
      startAt: interval.startAt
    });

    return {
      data: {
        endAt: created.endAt.toISOString(),
        id: created.id,
        reason: created.reason,
        startAt: created.startAt.toISOString(),
        tableId: created.tableId
      }
    };
  }
}

function parseInterval(startAt: string, endAt: string): { endAt: Date; startAt: Date } {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!isFiniteDate(start) || !isFiniteDate(end)) {
    throw new BadRequestException("startAt and endAt must be valid ISO datetime values");
  }
  if (start.getTime() >= end.getTime()) {
    throw new BadRequestException("startAt must be earlier than endAt");
  }

  return {
    endAt: end,
    startAt: start
  };
}

function isFiniteDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

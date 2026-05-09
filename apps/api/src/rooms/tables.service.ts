import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { CreateTableDto, UpdateTableDto } from "./dto/tables.dto.js";
import type { CreateTableInput, UpdateTableInput } from "./tables.repository.js";
import { TablesRepository } from "./tables.repository.js";

type TableResponse = {
  data: {
    capacity: number;
    id: string;
    isActive: boolean;
    number: string;
    roomId: string;
    sortOrder: number;
  };
};

type TablesResponse = {
  data: TableResponse["data"][];
};

@Injectable()
export class TablesService {
  constructor(private readonly tablesRepository: TablesRepository) {}

  async getActiveTablesByRoom(roomId: string): Promise<TablesResponse> {
    const tables = await this.tablesRepository.listActiveTablesByRoom(roomId);

    return {
      data: tables.map(mapTableToResponse)
    };
  }

  async createTable(body: CreateTableDto): Promise<TableResponse> {
    const roomExists = await this.tablesRepository.roomExists(body.roomId);
    if (!roomExists) {
      throw new NotFoundException("Room was not found");
    }

    try {
      const created = await this.tablesRepository.createTable(buildCreateTableInput(body));

      return {
        data: mapTableToResponse(created)
      };
    } catch (error: unknown) {
      throw mapPersistenceError(error);
    }
  }

  async updateTable(tableId: string, body: UpdateTableDto): Promise<TableResponse> {
    if (!hasAnyDefinedValue(body, ["roomId", "number", "capacity", "sortOrder", "isActive"])) {
      throw new BadRequestException("At least one table field must be provided");
    }

    if (body.roomId !== undefined) {
      const roomExists = await this.tablesRepository.roomExists(body.roomId);
      if (!roomExists) {
        throw new NotFoundException("Room was not found");
      }
    }

    try {
      const updated = await this.tablesRepository.updateTable(tableId, buildUpdateTableInput(body));
      if (!updated) {
        throw new NotFoundException("Table was not found");
      }

      return {
        data: mapTableToResponse(updated)
      };
    } catch (error: unknown) {
      throw mapPersistenceError(error);
    }
  }

  async deleteTable(tableId: string): Promise<TableResponse> {
    const deactivated = await this.tablesRepository.deactivateTable(tableId);
    if (!deactivated) {
      throw new NotFoundException("Table was not found");
    }

    return {
      data: mapTableToResponse(deactivated)
    };
  }
}

function hasAnyDefinedValue<T extends object>(payload: T, keys: Array<keyof T>): boolean {
  return keys.some((key) => payload[key] !== undefined);
}

function mapTableToResponse(
  table: Awaited<ReturnType<TablesRepository["createTable"]>>
): TableResponse["data"] {
  return {
    capacity: table.capacity,
    id: table.id,
    isActive: table.isActive,
    number: table.number,
    roomId: table.roomId,
    sortOrder: table.sortOrder
  };
}

function buildCreateTableInput(body: CreateTableDto): CreateTableInput {
  const input: CreateTableInput = {
    capacity: body.capacity,
    number: body.number,
    roomId: body.roomId
  };

  if (body.sortOrder !== undefined) {
    input.sortOrder = body.sortOrder;
  }
  if (body.isActive !== undefined) {
    input.isActive = body.isActive;
  }

  return input;
}

function buildUpdateTableInput(body: UpdateTableDto): UpdateTableInput {
  const input: UpdateTableInput = {};

  if (body.roomId !== undefined) {
    input.roomId = body.roomId;
  }
  if (body.number !== undefined) {
    input.number = body.number;
  }
  if (body.capacity !== undefined) {
    input.capacity = body.capacity;
  }
  if (body.sortOrder !== undefined) {
    input.sortOrder = body.sortOrder;
  }
  if (body.isActive !== undefined) {
    input.isActive = body.isActive;
  }

  return input;
}

function mapPersistenceError(error: unknown): Error {
  const knownError = asPrismaKnownRequestError(error);
  if (
    knownError?.code === "P2002" &&
    Array.isArray(knownError.meta?.target) &&
    knownError.meta.target.some((target) => target === "roomId" || target === "number")
  ) {
    return new ConflictException("Table number already exists in this room");
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

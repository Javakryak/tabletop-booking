import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { CreateRoomDto, UpdateRoomDto } from "./dto/rooms.dto.js";
import type { CreateRoomInput, UpdateRoomInput } from "./rooms.repository.js";
import { RoomsRepository } from "./rooms.repository.js";

type RoomResponse = {
  data: {
    description: string | null;
    id: string;
    isActive: boolean;
    name: string;
    sortOrder: number;
  };
};

type RoomsResponse = {
  data: RoomResponse["data"][];
};

@Injectable()
export class RoomsService {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  async getActiveRooms(): Promise<RoomsResponse> {
    const rooms = await this.roomsRepository.listActiveRooms();

    return {
      data: rooms.map(mapRoomToResponse)
    };
  }

  async createRoom(body: CreateRoomDto): Promise<RoomResponse> {
    const created = await this.roomsRepository.createRoom(buildCreateRoomInput(body));

    return {
      data: mapRoomToResponse(created)
    };
  }

  async updateRoom(roomId: string, body: UpdateRoomDto): Promise<RoomResponse> {
    if (!hasAnyDefinedValue(body, ["name", "description", "sortOrder", "isActive"])) {
      throw new BadRequestException("At least one room field must be provided");
    }

    const updated = await this.roomsRepository.updateRoom(roomId, buildUpdateRoomInput(body));
    if (!updated) {
      throw new NotFoundException("Room was not found");
    }

    return {
      data: mapRoomToResponse(updated)
    };
  }

  async deleteRoom(roomId: string): Promise<RoomResponse> {
    const deactivated = await this.roomsRepository.deactivateRoom(roomId);
    if (!deactivated) {
      throw new NotFoundException("Room was not found");
    }

    return {
      data: mapRoomToResponse(deactivated)
    };
  }
}

function hasAnyDefinedValue<T extends object>(payload: T, keys: Array<keyof T>): boolean {
  return keys.some((key) => payload[key] !== undefined);
}

function mapRoomToResponse(
  room: Awaited<ReturnType<RoomsRepository["createRoom"]>>
): RoomResponse["data"] {
  return {
    description: room.description,
    id: room.id,
    isActive: room.isActive,
    name: room.name,
    sortOrder: room.sortOrder
  };
}

function buildCreateRoomInput(body: CreateRoomDto): CreateRoomInput {
  const input: CreateRoomInput = {
    name: body.name
  };

  if (body.description !== undefined) {
    input.description = body.description;
  }
  if (body.sortOrder !== undefined) {
    input.sortOrder = body.sortOrder;
  }
  if (body.isActive !== undefined) {
    input.isActive = body.isActive;
  }

  return input;
}

function buildUpdateRoomInput(body: UpdateRoomDto): UpdateRoomInput {
  const input: UpdateRoomInput = {};

  if (body.name !== undefined) {
    input.name = body.name;
  }
  if (body.description !== undefined) {
    input.description = body.description;
  }
  if (body.sortOrder !== undefined) {
    input.sortOrder = body.sortOrder;
  }
  if (body.isActive !== undefined) {
    input.isActive = body.isActive;
  }

  return input;
}

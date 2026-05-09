import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { CreateRoomDto, RoomEnvelopeDto, UpdateRoomDto } from "./dto/rooms.dto.js";
import { RoomsService } from "./rooms.service.js";

@ApiTags("rooms")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/rooms")
export class OwnerRoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: "Create room (owner only)" })
  @ApiBody({ type: CreateRoomDto })
  @ApiOkResponse({ type: RoomEnvelopeDto })
  async createRoom(@Body() body: CreateRoomDto) {
    return await this.roomsService.createRoom(body);
  }

  @Patch(":roomId")
  @ApiOperation({ summary: "Update room (owner only)" })
  @ApiBody({ type: UpdateRoomDto })
  @ApiOkResponse({ type: RoomEnvelopeDto })
  async updateRoom(
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @Body() body: UpdateRoomDto
  ) {
    return await this.roomsService.updateRoom(roomId, body);
  }

  @Delete(":roomId")
  @ApiOperation({ summary: "Deactivate room (owner only)" })
  @ApiOkResponse({ type: RoomEnvelopeDto })
  async deleteRoom(@Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string) {
    return await this.roomsService.deleteRoom(roomId);
  }
}

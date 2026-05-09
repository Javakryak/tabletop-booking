import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { RoomsEnvelopeDto } from "./dto/rooms.dto.js";
import { RoomsService } from "./rooms.service.js";

@ApiTags("rooms")
@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get("rooms")
  @ApiOperation({ summary: "List active rooms visible to guests and users" })
  @ApiOkResponse({ type: RoomsEnvelopeDto })
  async getRooms() {
    return await this.roomsService.getActiveRooms();
  }
}

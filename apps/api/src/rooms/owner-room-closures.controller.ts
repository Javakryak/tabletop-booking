import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from "@nestjs/common";
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
import { CreateResourceClosureDto, RoomClosureEnvelopeDto } from "./dto/closures.dto.js";
import { ClosuresService } from "./closures.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@ApiTags("rooms")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/rooms")
export class OwnerRoomClosuresController {
  constructor(private readonly closuresService: ClosuresService) {}

  @Post(":roomId/closures")
  @ApiOperation({ summary: "Create room closure interval (owner only)" })
  @ApiBody({ type: CreateResourceClosureDto })
  @ApiOkResponse({ type: RoomClosureEnvelopeDto })
  async createRoomClosure(
    @Req() request: AuthenticatedRequest,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @Body() body: CreateResourceClosureDto
  ) {
    return await this.closuresService.createRoomClosure(request.user.id, roomId, body);
  }
}

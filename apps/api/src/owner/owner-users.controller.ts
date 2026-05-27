import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { UserBlockDto, UserModerationEnvelopeDto } from "./dto/audit-log.dto.js";
import { OwnerService } from "./owner.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
    roles: string[];
  };
};

@ApiTags("owner")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/users")
export class OwnerUsersController {
  constructor(private readonly ownerService: OwnerService) {}

  @Post(":userId/block")
  @ApiOperation({ summary: "Block a user with audit logging" })
  @ApiParam({ name: "userId", format: "uuid" })
  @ApiBody({ type: UserBlockDto })
  @ApiOkResponse({ type: UserModerationEnvelopeDto })
  async blockUser(
    @Req() request: AuthenticatedRequest,
    @Param("userId") userId: string,
    @Body() body: UserBlockDto
  ) {
    return await this.ownerService.blockUser({
      actorUserId: request.user.id,
      reason: body.reason,
      targetUserId: userId
    });
  }

  @Post(":userId/unblock")
  @ApiOperation({ summary: "Unblock a user with audit logging" })
  @ApiParam({ name: "userId", format: "uuid" })
  @ApiOkResponse({ type: UserModerationEnvelopeDto })
  async unblockUser(@Req() request: AuthenticatedRequest, @Param("userId") userId: string) {
    return await this.ownerService.unblockUser({
      actorUserId: request.user.id,
      targetUserId: userId
    });
  }
}

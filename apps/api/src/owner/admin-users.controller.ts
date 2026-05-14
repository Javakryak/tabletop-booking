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
import {
  EmergencyContactAccessDto,
  EmergencyContactAccessEnvelopeDto
} from "./dto/audit-log.dto.js";
import { OwnerService } from "./owner.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
    roles: string[];
  };
};

@ApiTags("admin")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "owner")
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly ownerService: OwnerService) {}

  @Post(":userId/emergency-contact-access")
  @ApiOperation({ summary: "Reveal emergency contact phone with audit logging" })
  @ApiParam({ name: "userId", format: "uuid" })
  @ApiBody({ type: EmergencyContactAccessDto })
  @ApiOkResponse({ type: EmergencyContactAccessEnvelopeDto })
  async revealEmergencyContact(
    @Req() request: AuthenticatedRequest,
    @Param("userId") userId: string,
    @Body() body: EmergencyContactAccessDto
  ) {
    const input: {
      actorUserId: string;
      reason: string;
      relatedBookingId?: string;
      targetUserId: string;
    } = {
      actorUserId: request.user.id,
      reason: body.reason,
      targetUserId: userId
    };
    if (body.relatedBookingId) {
      input.relatedBookingId = body.relatedBookingId;
    }

    return await this.ownerService.revealEmergencyContact(input);
  }
}

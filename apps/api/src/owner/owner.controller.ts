import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { PendingDeletionRequestsEnvelopeDto } from "./dto/owner-deletion-request.dto.js";
import { OwnerService } from "./owner.service.js";

@ApiTags("owner")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "owner")
@Controller("owner/users")
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get("deletion-requests")
  @ApiOperation({ summary: "List pending account deletion requests" })
  @ApiOkResponse({ type: PendingDeletionRequestsEnvelopeDto })
  async getPendingDeletionRequests() {
    return await this.ownerService.getPendingDeletionRequests();
  }
}

import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { AuditLogsEnvelopeDto, OwnerAuditLogQueryDto } from "./dto/audit-log.dto.js";
import { OwnerService } from "./owner.service.js";

@ApiTags("owner")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/audit-logs")
export class OwnerAuditLogsController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get()
  @ApiOperation({ summary: "List audit events for owner review" })
  @ApiOkResponse({ type: AuditLogsEnvelopeDto })
  async getAuditLogs(@Query() query: OwnerAuditLogQueryDto) {
    return await this.ownerService.getAuditLogs(query);
  }
}

import { Body, Controller, Put, UseGuards } from "@nestjs/common";
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
import { UpdateWorkingHoursDto, WorkingHoursEnvelopeDto } from "./dto/working-hours.dto.js";
import { ScheduleService } from "./schedule.service.js";

@ApiTags("schedule")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/schedule")
export class OwnerScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Put("working-hours")
  @ApiOperation({ summary: "Update weekly working hours schedule (owner only)" })
  @ApiBody({ type: UpdateWorkingHoursDto })
  @ApiOkResponse({ type: WorkingHoursEnvelopeDto })
  async updateWorkingHours(@Body() body: UpdateWorkingHoursDto) {
    return await this.scheduleService.updateWorkingHours(body);
  }
}

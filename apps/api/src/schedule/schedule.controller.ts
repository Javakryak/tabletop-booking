import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { WorkingHoursEnvelopeDto } from "./dto/working-hours.dto.js";
import { ScheduleService } from "./schedule.service.js";

@ApiTags("schedule")
@Controller("schedule")
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get("working-hours")
  @ApiOperation({ summary: "Get weekly working hours schedule" })
  @ApiOkResponse({ type: WorkingHoursEnvelopeDto })
  async getWorkingHours() {
    return await this.scheduleService.getWorkingHours();
  }
}

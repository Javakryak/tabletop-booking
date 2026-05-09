import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ScheduleExceptionsEnvelopeDto } from "./dto/schedule-exceptions.dto.js";
import { ScheduleExceptionsService } from "./schedule-exceptions.service.js";

@ApiTags("schedule")
@Controller("schedule")
export class ScheduleExceptionsController {
  constructor(private readonly scheduleExceptionsService: ScheduleExceptionsService) {}

  @Get("exceptions")
  @ApiOperation({ summary: "Get date-specific schedule exceptions" })
  @ApiOkResponse({ type: ScheduleExceptionsEnvelopeDto })
  async getScheduleExceptions() {
    return await this.scheduleExceptionsService.listScheduleExceptions();
  }
}

import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
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
import {
  CreateScheduleExceptionDto,
  ScheduleExceptionEnvelopeDto,
  UpdateScheduleExceptionDto
} from "./dto/schedule-exceptions.dto.js";
import { ScheduleExceptionsService } from "./schedule-exceptions.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@ApiTags("schedule")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/schedule/exceptions")
export class OwnerScheduleExceptionsController {
  constructor(private readonly scheduleExceptionsService: ScheduleExceptionsService) {}

  @Post()
  @ApiOperation({ summary: "Create schedule exception (owner only)" })
  @ApiBody({ type: CreateScheduleExceptionDto })
  @ApiOkResponse({ type: ScheduleExceptionEnvelopeDto })
  async createScheduleException(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateScheduleExceptionDto
  ) {
    return await this.scheduleExceptionsService.createScheduleException(request.user.id, body);
  }

  @Patch(":exceptionId")
  @ApiOperation({ summary: "Update schedule exception (owner only)" })
  @ApiBody({ type: UpdateScheduleExceptionDto })
  @ApiOkResponse({ type: ScheduleExceptionEnvelopeDto })
  async updateScheduleException(
    @Param("exceptionId", new ParseUUIDPipe({ version: "4" })) exceptionId: string,
    @Body() body: UpdateScheduleExceptionDto
  ) {
    return await this.scheduleExceptionsService.updateScheduleException(exceptionId, body);
  }

  @Delete(":exceptionId")
  @ApiOperation({ summary: "Delete schedule exception (owner only)" })
  @ApiOkResponse({ type: ScheduleExceptionEnvelopeDto })
  async deleteScheduleException(
    @Param("exceptionId", new ParseUUIDPipe({ version: "4" })) exceptionId: string
  ) {
    return await this.scheduleExceptionsService.deleteScheduleException(exceptionId);
  }
}

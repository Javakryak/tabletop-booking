import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import {
  BookingAvailabilityEnvelopeDto,
  GetBookingAvailabilityQueryDto
} from "./dto/availability.dto.js";
import { BookingsService } from "./bookings.service.js";

@ApiTags("bookings")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("user", "admin", "owner")
@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get("bookings/availability")
  @ApiOperation({
    summary: "Get bookable table slots for a date based on schedule, closures, and active bookings"
  })
  @ApiQuery({ name: "date", required: true, description: "Date in YYYY-MM-DD format" })
  @ApiQuery({ name: "roomId", required: false, description: "Optional room filter" })
  @ApiQuery({ name: "partySize", required: false, description: "Minimum required table capacity" })
  @ApiQuery({
    name: "durationMinutes",
    required: false,
    description: "Desired duration in minutes; must align with slot step"
  })
  @ApiOkResponse({ type: BookingAvailabilityEnvelopeDto })
  async getAvailability(@Query() query: GetBookingAvailabilityQueryDto) {
    return await this.bookingsService.getAvailability(query);
  }
}

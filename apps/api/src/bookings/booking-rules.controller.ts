import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { BookingRulesEnvelopeDto } from "./dto/booking-rules.dto.js";
import { BookingsService } from "./bookings.service.js";

@ApiTags("bookings")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("user", "admin", "owner")
@Controller()
export class BookingRulesController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get("booking-rules")
  @ApiOperation({ summary: "Get current booking rules" })
  @ApiOkResponse({ type: BookingRulesEnvelopeDto })
  async getBookingRules() {
    return await this.bookingsService.getBookingRules();
  }
}

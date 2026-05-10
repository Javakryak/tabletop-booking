import { Body, Controller, Put, Req, UseGuards } from "@nestjs/common";
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
  BookingRulesEnvelopeDto,
  UpdateBookingRulesDto
} from "./dto/booking-rules.dto.js";
import { BookingsService } from "./bookings.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@ApiTags("bookings")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/booking-rules")
export class OwnerBookingRulesController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Put()
  @ApiOperation({ summary: "Update booking rules as owner" })
  @ApiBody({ type: UpdateBookingRulesDto })
  @ApiOkResponse({ type: BookingRulesEnvelopeDto })
  async updateBookingRules(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateBookingRulesDto
  ) {
    return await this.bookingsService.updateBookingRules(request.user.id, body);
  }
}

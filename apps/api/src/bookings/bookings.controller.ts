import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
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
import {
  BookingRequestEnvelopeDto,
  CreateBookingRequestDto
} from "./dto/create-booking.dto.js";
import { CancelBookingDto } from "./dto/cancel-booking.dto.js";
import { BookingStatusTransitionEnvelopeDto } from "./dto/admin-bookings.dto.js";
import { BookingsService } from "./bookings.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

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

  @Post("bookings")
  @ApiOperation({ summary: "Create a pending booking request for an active table" })
  @ApiBody({ type: CreateBookingRequestDto })
  @ApiOkResponse({ type: BookingRequestEnvelopeDto })
  async createBookingRequest(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateBookingRequestDto
  ) {
    return await this.bookingsService.createBookingRequest(request.user.id, body);
  }

  @Post("bookings/:bookingId/cancel")
  @ApiOperation({ summary: "Cancel own pending or confirmed booking if cancellation policy allows" })
  @ApiBody({ type: CancelBookingDto })
  @ApiOkResponse({ type: BookingStatusTransitionEnvelopeDto })
  async cancelOwnBooking(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId") bookingId: string,
    @Body() body: CancelBookingDto
  ) {
    const payload: {
      actorUserId: string;
      bookingId: string;
      reason?: string;
    } = {
      actorUserId: request.user.id,
      bookingId
    };
    if (body.reason !== undefined) {
      payload.reason = body.reason;
    }

    return await this.bookingsService.cancelOwnBooking(payload);
  }
}

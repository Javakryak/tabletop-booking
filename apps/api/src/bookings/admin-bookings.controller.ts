import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import {
  AdminCancelBookingDto,
  BookingStatusTransitionEnvelopeDto
} from "./dto/admin-bookings.dto.js";
import { BookingsService } from "./bookings.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
    roles: string[];
  };
};

@ApiTags("bookings")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "owner")
@Controller("admin/bookings")
export class AdminBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post(":bookingId/confirm")
  @ApiOperation({ summary: "Confirm pending booking as admin/owner" })
  @ApiParam({ name: "bookingId", format: "uuid" })
  @ApiOkResponse({ type: BookingStatusTransitionEnvelopeDto })
  async confirmBooking(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId") bookingId: string
  ) {
    return await this.bookingsService.adminConfirmBooking({
      actorRole: resolveActorRole(request.user.roles),
      actorUserId: request.user.id,
      bookingId
    });
  }

  @Post(":bookingId/cancel")
  @ApiOperation({ summary: "Cancel pending or confirmed booking as admin/owner" })
  @ApiParam({ name: "bookingId", format: "uuid" })
  @ApiBody({ type: AdminCancelBookingDto })
  @ApiOkResponse({ type: BookingStatusTransitionEnvelopeDto })
  async cancelBooking(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId") bookingId: string,
    @Body() body: AdminCancelBookingDto
  ) {
    const payload: {
      actorRole: "admin" | "owner";
      actorUserId: string;
      bookingId: string;
      reason?: string;
    } = {
      actorRole: resolveActorRole(request.user.roles),
      actorUserId: request.user.id,
      bookingId
    };
    if (body.reason !== undefined) {
      payload.reason = body.reason;
    }

    return await this.bookingsService.adminCancelBooking(payload);
  }
}

function resolveActorRole(roles: string[]): "admin" | "owner" {
  if (roles.includes("owner")) {
    return "owner";
  }

  return "admin";
}

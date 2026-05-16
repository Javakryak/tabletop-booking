import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
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
  AdminBookingQueueEnvelopeDto,
  AdminCancelBookingDto,
  AdminBookingsQueryDto,
  AdminMoveBookingDto,
  AdminMoveBookingEnvelopeDto,
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

  @Get()
  @ApiOperation({ summary: "List bookings for admin queue and operational actions" })
  @ApiOkResponse({ type: AdminBookingQueueEnvelopeDto })
  async listBookings(@Query() query: AdminBookingsQueryDto) {
    return await this.bookingsService.getAdminBookings(query);
  }

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

  @Post(":bookingId/move")
  @ApiOperation({
    summary: "Move/reschedule pending or confirmed booking to another table/time interval"
  })
  @ApiParam({ name: "bookingId", format: "uuid" })
  @ApiBody({ type: AdminMoveBookingDto })
  @ApiOkResponse({ type: AdminMoveBookingEnvelopeDto })
  async moveBooking(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId") bookingId: string,
    @Body() body: AdminMoveBookingDto
  ) {
    const payload: {
      actorUserId: string;
      bookingId: string;
      endAt: string;
      reason?: string;
      startAt: string;
      tableId: string;
    } = {
      actorUserId: request.user.id,
      bookingId,
      endAt: body.endAt,
      startAt: body.startAt,
      tableId: body.tableId
    };
    if (body.reason !== undefined) {
      payload.reason = body.reason;
    }

    return await this.bookingsService.adminMoveBooking(payload);
  }
}

function resolveActorRole(roles: string[]): "admin" | "owner" {
  if (roles.includes("owner")) {
    return "owner";
  }

  return "admin";
}

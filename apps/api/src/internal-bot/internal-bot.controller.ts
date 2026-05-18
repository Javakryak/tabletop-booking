import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { BotInternalAuthService } from "./bot-internal-auth.service.js";
import {
  BotNotificationEventsEnvelopeDto,
  InternalBotDeliveryAckEnvelopeDto,
  InternalBotNotificationDeliveryEnvelopeDto,
  InternalBotPendingNotificationsQueryDto
} from "./dto/booking-notifications.dto.js";
import { InternalBotService } from "./internal-bot.service.js";

@ApiTags("internal-bot")
@Controller("internal/bot")
export class InternalBotController {
  constructor(
    private readonly authService: BotInternalAuthService,
    private readonly internalBotService: InternalBotService
  ) {}

  @Get("booking-notifications/pending")
  @ApiOperation({ summary: "List pending booking notifications for Telegram bot delivery worker" })
  @ApiOkResponse({ type: BotNotificationEventsEnvelopeDto })
  async listPendingNotifications(
    @Headers("x-telegram-bot-token") botTokenHeader: string | undefined,
    @Query() query: InternalBotPendingNotificationsQueryDto
  ) {
    this.authService.assertBotToken(botTokenHeader);

    return await this.internalBotService.listPendingBookingNotifications(query.limit ?? 20);
  }

  @Post("booking-notification-delivered")
  @ApiOperation({ summary: "Record Telegram notification delivery attempt result" })
  @ApiBody({ type: InternalBotNotificationDeliveryEnvelopeDto })
  @ApiOkResponse({ type: InternalBotDeliveryAckEnvelopeDto })
  async recordNotificationDelivery(
    @Headers("x-telegram-bot-token") botTokenHeader: string | undefined,
    @Body() body: InternalBotNotificationDeliveryEnvelopeDto
  ): Promise<{ data: { status: "received" } }> {
    this.authService.assertBotToken(botTokenHeader);

    await this.internalBotService.recordDeliveryAttempt(body.data);
    return {
      data: {
        status: "received"
      }
    };
  }
}

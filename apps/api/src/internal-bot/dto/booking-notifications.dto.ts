import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

function normalizeNullableString(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class InternalBotPendingNotificationsQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" && value.trim().length > 0 ? Number.parseInt(value, 10) : undefined
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

const NOTIFICATION_TYPE_VALUES = [
  "new_booking_request_admin",
  "booking_confirmed_user",
  "booking_cancelled_user",
  "booking_moved_user",
  "booking_reminder_user"
] as const;

const DELIVERY_STATUS_VALUES = ["delivered", "failed"] as const;

export class BotNotificationBookingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty()
  roomName!: string;

  @ApiProperty()
  tableNumber!: string;
}

export class BotNotificationEventDto {
  @ApiProperty({ format: "uuid" })
  requestId!: string;

  @ApiProperty({ enum: NOTIFICATION_TYPE_VALUES })
  notificationType!:
    | "new_booking_request_admin"
    | "booking_confirmed_user"
    | "booking_cancelled_user"
    | "booking_moved_user"
    | "booking_reminder_user";

  @ApiProperty({ format: "uuid" })
  recipientUserId!: string;

  @ApiProperty()
  recipientTelegramId!: string;

  @ApiProperty({ type: BotNotificationBookingDto })
  booking!: BotNotificationBookingDto;
}

export class BotNotificationEventsEnvelopeDto {
  @ApiProperty({ type: BotNotificationEventDto, isArray: true })
  data!: BotNotificationEventDto[];
}

export class InternalBotNotificationDeliveryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID(4)
  requestId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID(4)
  recipientUserId!: string;

  @ApiProperty({ enum: NOTIFICATION_TYPE_VALUES })
  @IsIn(NOTIFICATION_TYPE_VALUES)
  notificationType!:
    | "new_booking_request_admin"
    | "booking_confirmed_user"
    | "booking_cancelled_user"
    | "booking_moved_user"
    | "booking_reminder_user";

  @ApiProperty({ enum: DELIVERY_STATUS_VALUES })
  @IsIn(DELIVERY_STATUS_VALUES)
  status!: "delivered" | "failed";

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @MaxLength(120)
  failureCode?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @MaxLength(500)
  failureMessage?: string;
}

export class InternalBotNotificationDeliveryEnvelopeDto {
  @ApiProperty({ type: InternalBotNotificationDeliveryDto })
  data!: InternalBotNotificationDeliveryDto;
}

export class InternalBotDeliveryAckDto {
  @ApiProperty({ enum: ["received"] })
  status!: "received";
}

export class InternalBotDeliveryAckEnvelopeDto {
  @ApiProperty({ type: InternalBotDeliveryAckDto })
  data!: InternalBotDeliveryAckDto;
}

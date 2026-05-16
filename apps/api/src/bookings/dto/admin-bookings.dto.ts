import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from "class-validator";

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

const BOOKING_STATUS_VALUES = [
  "pending",
  "confirmed",
  "cancelled_by_user",
  "cancelled_by_admin",
  "completed",
  "expired"
] as const;

export class AdminCancelBookingDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
}

export class BookingStatusTransitionDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty({
    enum: BOOKING_STATUS_VALUES
  })
  status!:
    | "pending"
    | "confirmed"
    | "cancelled_by_user"
    | "cancelled_by_admin"
    | "completed"
    | "expired";
}

export class BookingStatusTransitionEnvelopeDto {
  @ApiProperty({ type: BookingStatusTransitionDto })
  data!: BookingStatusTransitionDto;
}

export class AdminBookingsQueryDto {
  @ApiPropertyOptional({
    enum: BOOKING_STATUS_VALUES,
    description: "Optional booking status filter. Admin queue uses status=pending."
  })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsIn(BOOKING_STATUS_VALUES)
  status?:
    | "pending"
    | "confirmed"
    | "cancelled_by_user"
    | "cancelled_by_admin"
    | "completed"
    | "expired";
}

export class AdminBookingQueueUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ nullable: true })
  telegramUsername!: string | null;
}

export class AdminBookingQueueRoomDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AdminBookingQueueTableDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: string;
}

export class AdminBookingQueueContactDto {
  @ApiProperty({ nullable: true })
  phoneMasked!: string | null;

  @ApiProperty({ nullable: true })
  emailMasked!: string | null;
}

export class AdminBookingQueueItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: BOOKING_STATUS_VALUES
  })
  status!:
    | "pending"
    | "confirmed"
    | "cancelled_by_user"
    | "cancelled_by_admin"
    | "completed"
    | "expired";

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty({ type: AdminBookingQueueUserDto })
  user!: AdminBookingQueueUserDto;

  @ApiProperty({ type: AdminBookingQueueRoomDto })
  room!: AdminBookingQueueRoomDto;

  @ApiProperty({ type: AdminBookingQueueTableDto })
  table!: AdminBookingQueueTableDto;

  @ApiProperty({ type: AdminBookingQueueContactDto })
  contact!: AdminBookingQueueContactDto;
}

export class AdminBookingQueueEnvelopeDto {
  @ApiProperty({ type: AdminBookingQueueItemDto, isArray: true })
  data!: AdminBookingQueueItemDto[];
}

export class AdminMoveBookingDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID(4)
  tableId!: string;

  @ApiProperty({ example: "2026-05-02T19:00:00+03:00" })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: "2026-05-02T22:00:00+03:00" })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
}

export class AdminMoveBookingResultDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty({
    enum: BOOKING_STATUS_VALUES
  })
  status!:
    | "pending"
    | "confirmed"
    | "cancelled_by_user"
    | "cancelled_by_admin"
    | "completed"
    | "expired";

  @ApiProperty()
  tableId!: string;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;
}

export class AdminMoveBookingEnvelopeDto {
  @ApiProperty({ type: AdminMoveBookingResultDto })
  data!: AdminMoveBookingResultDto;
}

import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

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
    enum: [
      "pending",
      "confirmed",
      "cancelled_by_user",
      "cancelled_by_admin",
      "completed",
      "expired"
    ]
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

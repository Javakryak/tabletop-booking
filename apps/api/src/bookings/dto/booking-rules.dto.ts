import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, Min } from "class-validator";

function toInteger(value: unknown): unknown {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return value;
    }

    return Number.parseInt(trimmed, 10);
  }

  return value;
}

export class BookingRulesDto {
  @ApiProperty({ minimum: 30, example: 30 })
  slotMinutes!: number;

  @ApiProperty({ minimum: 0, example: 120 })
  minCancellationNoticeMinutes!: number;

  @ApiProperty({ minimum: 0, example: 3 })
  maxActiveBookingsPerUser!: number;

  @ApiProperty({ example: true })
  allowFullDayBooking!: boolean;
}

export class BookingRulesEnvelopeDto {
  @ApiProperty({ type: BookingRulesDto })
  data!: BookingRulesDto;
}

export class UpdateBookingRulesDto {
  @ApiProperty({ minimum: 30, example: 30 })
  @Transform(({ value }) => toInteger(value))
  @IsInt()
  @Min(30)
  slotMinutes!: number;

  @ApiProperty({ minimum: 0, example: 120 })
  @Transform(({ value }) => toInteger(value))
  @IsInt()
  @Min(0)
  minCancellationNoticeMinutes!: number;

  @ApiProperty({ minimum: 0, example: 3 })
  @Transform(({ value }) => toInteger(value))
  @IsInt()
  @Min(0)
  maxActiveBookingsPerUser!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowFullDayBooking!: boolean;
}

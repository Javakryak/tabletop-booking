import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Matches, Min } from "class-validator";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function trimString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

function toOptionalInteger(value: unknown): unknown {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    return Number.parseInt(trimmed, 10);
  }

  return value;
}

export class BookingAvailabilitySlotDto {
  @ApiProperty({ example: "2026-05-02T12:00:00.000Z" })
  startAt!: string;

  @ApiProperty({ example: "2026-05-02T12:30:00.000Z" })
  endAt!: string;
}

export class BookingAvailabilityTableDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  capacity!: number;

  @ApiProperty({ type: BookingAvailabilitySlotDto, isArray: true })
  availableSlots!: BookingAvailabilitySlotDto[];
}

export class BookingAvailabilityRoomDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: BookingAvailabilityTableDto, isArray: true })
  tables!: BookingAvailabilityTableDto[];
}

export class BookingAvailabilityDataDto {
  @ApiProperty({ example: "2026-05-02" })
  date!: string;

  @ApiProperty({ minimum: 1, example: 30 })
  slotMinutes!: number;

  @ApiProperty({ type: BookingAvailabilityRoomDto, isArray: true })
  rooms!: BookingAvailabilityRoomDto[];
}

export class BookingAvailabilityEnvelopeDto {
  @ApiProperty({ type: BookingAvailabilityDataDto })
  data!: BookingAvailabilityDataDto;
}

export class GetBookingAvailabilityQueryDto {
  @ApiProperty({ example: "2026-05-02" })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(ISO_DATE_REGEX, {
    message: "date must be in YYYY-MM-DD format"
  })
  date!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsUUID(4)
  roomId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(1)
  partySize?: number;

  @ApiPropertyOptional({ minimum: 30, description: "Must align with slot step" })
  @IsOptional()
  @Transform(({ value }) => toOptionalInteger(value))
  @IsInt()
  @Min(30)
  durationMinutes?: number;
}

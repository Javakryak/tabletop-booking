import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
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

export class CreateBookingRequestDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID(4)
  tableId!: string;

  @ApiProperty({ example: "2026-05-02T18:00:00+03:00" })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: "2026-05-02T21:00:00+03:00" })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  comment?: string;
}

export class BookingRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ["pending"] })
  status!: "pending";

  @ApiProperty()
  tableId!: string;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiPropertyOptional({ nullable: true })
  comment!: string | null;
}

export class BookingRequestEnvelopeDto {
  @ApiProperty({ type: BookingRequestDto })
  data!: BookingRequestDto;
}

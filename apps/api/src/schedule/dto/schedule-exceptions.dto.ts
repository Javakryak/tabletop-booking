import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

const EXCEPTION_TYPES = ["closed", "short_day", "special_hours"] as const;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export type ScheduleExceptionType = (typeof EXCEPTION_TYPES)[number];

function trimString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

function normalizeNullableString(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class ScheduleExceptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "2026-05-09" })
  date!: string;

  @ApiProperty({ enum: EXCEPTION_TYPES })
  type!: ScheduleExceptionType;

  @ApiProperty({ nullable: true, example: "12:00" })
  opensAt!: string | null;

  @ApiProperty({ nullable: true, example: "20:00" })
  closesAt!: string | null;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty({ nullable: true })
  reason!: string | null;
}

export class ScheduleExceptionsEnvelopeDto {
  @ApiProperty({ type: ScheduleExceptionDto, isArray: true })
  data!: ScheduleExceptionDto[];
}

export class ScheduleExceptionEnvelopeDto {
  @ApiProperty({ type: ScheduleExceptionDto })
  data!: ScheduleExceptionDto;
}

export class CreateScheduleExceptionDto {
  @ApiProperty({ example: "2026-05-09" })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(ISO_DATE_REGEX, {
    message: "date must be in YYYY-MM-DD format"
  })
  date!: string;

  @ApiProperty({ enum: EXCEPTION_TYPES })
  @IsIn(EXCEPTION_TYPES)
  type!: ScheduleExceptionType;

  @ApiPropertyOptional({ nullable: true, example: "12:00" })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @Matches(TIME_HH_MM_REGEX, {
    message: "opensAt must be in HH:mm format"
  })
  opensAt?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "20:00" })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @Matches(TIME_HH_MM_REGEX, {
    message: "closesAt must be in HH:mm format"
  })
  closesAt?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string | null;
}

export class UpdateScheduleExceptionDto {
  @ApiPropertyOptional({ enum: EXCEPTION_TYPES })
  @IsOptional()
  @IsIn(EXCEPTION_TYPES)
  type?: ScheduleExceptionType;

  @ApiPropertyOptional({ nullable: true, example: "12:00" })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @Matches(TIME_HH_MM_REGEX, {
    message: "opensAt must be in HH:mm format"
  })
  opensAt?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "20:00" })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @Matches(TIME_HH_MM_REGEX, {
    message: "closesAt must be in HH:mm format"
  })
  closesAt?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string | null;
}

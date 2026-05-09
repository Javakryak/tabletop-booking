import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

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

export class CreateResourceClosureDto {
  @ApiProperty({ example: "2026-05-02T12:00:00+03:00" })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ example: "2026-05-02T18:00:00+03:00" })
  @IsISO8601()
  endAt!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string | null;
}

export class RoomClosureDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  roomId!: string;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;
}

export class RoomClosureEnvelopeDto {
  @ApiProperty({ type: RoomClosureDto })
  data!: RoomClosureDto;
}

export class TableClosureDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tableId!: string;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;
}

export class TableClosureEnvelopeDto {
  @ApiProperty({ type: TableClosureDto })
  data!: TableClosureDto;
}

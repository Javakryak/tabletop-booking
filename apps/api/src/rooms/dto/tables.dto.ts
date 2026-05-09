import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

function trimString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

export class TableDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  roomId!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  capacity!: number;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;
}

export class TableEnvelopeDto {
  @ApiProperty({ type: TableDto })
  data!: TableDto;
}

export class TablesEnvelopeDto {
  @ApiProperty({ type: TableDto, isArray: true })
  data!: TableDto[];
}

export class CreateTableDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID(4)
  roomId!: string;

  @ApiProperty({ minLength: 1, maxLength: 32 })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  number!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTableDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID(4)
  roomId?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 32 })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  number?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";

const TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function trimString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

export class WorkingHourDayDto {
  @ApiProperty({ minimum: 1, maximum: 7 })
  dayOfWeek!: number;

  @ApiProperty({ nullable: true, example: "12:00" })
  opensAt!: string | null;

  @ApiProperty({ nullable: true, example: "22:00" })
  closesAt!: string | null;

  @ApiProperty()
  isClosed!: boolean;
}

export class WorkingHoursDataDto {
  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: WorkingHourDayDto, isArray: true })
  days!: WorkingHourDayDto[];
}

export class WorkingHoursEnvelopeDto {
  @ApiProperty({ type: WorkingHoursDataDto })
  data!: WorkingHoursDataDto;
}

export class UpdateWorkingHourDayDto {
  @ApiProperty({ minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @ApiPropertyOptional({ nullable: true, example: "12:00" })
  @IsOptional()
  @IsString()
  @Matches(TIME_HH_MM_REGEX, {
    message: "opensAt must be in HH:mm format"
  })
  opensAt?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "22:00" })
  @IsOptional()
  @IsString()
  @Matches(TIME_HH_MM_REGEX, {
    message: "closesAt must be in HH:mm format"
  })
  closesAt?: string | null;

  @ApiProperty()
  @IsBoolean()
  isClosed!: boolean;
}

export class UpdateWorkingHoursDto {
  @ApiProperty({ minLength: 1, maxLength: 64, example: "Europe/Moscow" })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  timezone!: string;

  @ApiProperty({ type: UpdateWorkingHourDayDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkingHourDayDto)
  days!: UpdateWorkingHourDayDto[];
}

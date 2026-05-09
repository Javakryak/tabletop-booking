import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

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
  return trimmed.length === 0 ? null : trimmed;
}

export class MePrivacyDto {
  @ApiProperty()
  showTelegramUsernameToMeetupParticipants!: boolean;

  @ApiProperty()
  showPhoneToAdmins!: boolean;
}

export class MeProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ nullable: true })
  telegramUsername!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ type: MePrivacyDto })
  privacy!: MePrivacyDto;
}

export class MeEnvelopeDto {
  @ApiProperty({ type: MeProfileDto })
  data!: MeProfileDto;
}

export class UpdateMeProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 64 })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  displayName?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: "Emergency contact phone in E.164 format (or null to clear)"
  })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @Matches(PHONE_E164_REGEX, {
    message: "phone must be a valid E.164 phone number"
  })
  phone?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "Optional email address (or null to clear)"
  })
  @IsOptional()
  @Transform(({ value }) => normalizeNullableString(value))
  @IsEmail()
  email?: string | null;
}

export class UpdateMePrivacyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTelegramUsernameToMeetupParticipants?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPhoneToAdmins?: boolean;
}

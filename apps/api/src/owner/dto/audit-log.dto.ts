import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

function normalizeOptionalString(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class OwnerAuditLogQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  actorUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  entityId?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsISO8601()
  to?: string;
}

export class AuditLogEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  actorUserId!: string | null;

  @ApiProperty({ nullable: true })
  actorDisplayName!: string | null;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty({ nullable: true })
  entityId!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  metadata!: unknown;

  @ApiProperty()
  createdAt!: string;
}

export class AuditLogsEnvelopeDto {
  @ApiProperty({ type: AuditLogEventDto, isArray: true })
  data!: AuditLogEventDto[];
}

export class EmergencyContactAccessDto {
  @ApiProperty({ minLength: 5, maxLength: 500 })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  relatedBookingId?: string;
}

export class EmergencyContactAccessResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ nullable: true })
  telegramUsername!: string | null;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  auditLogId!: string;

  @ApiProperty()
  revealedAt!: string;
}

export class EmergencyContactAccessEnvelopeDto {
  @ApiProperty({ type: EmergencyContactAccessResponseDto })
  data!: EmergencyContactAccessResponseDto;
}

export class AdminUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ nullable: true })
  telegramUsername!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  blockedReason!: string | null;
}

export class AdminUsersEnvelopeDto {
  @ApiProperty({ type: AdminUserSummaryDto, isArray: true })
  data!: AdminUserSummaryDto[];
}

export class UserBlockDto {
  @ApiProperty({ minLength: 3, maxLength: 500 })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class UserModerationResponseDto extends AdminUserSummaryDto {
  @ApiProperty()
  auditLogId!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class UserModerationEnvelopeDto {
  @ApiProperty({ type: UserModerationResponseDto })
  data!: UserModerationResponseDto;
}

import { ApiProperty } from "@nestjs/swagger";

export class PendingDeletionRequestDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ nullable: true })
  telegramUsername!: string | null;

  @ApiProperty()
  requestedAt!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;
}

export class PendingDeletionRequestsEnvelopeDto {
  @ApiProperty({ type: PendingDeletionRequestDto, isArray: true })
  data!: PendingDeletionRequestDto[];
}

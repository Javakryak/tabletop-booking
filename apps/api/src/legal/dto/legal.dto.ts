import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

import { LEGAL_DOCUMENT_TYPES } from "../legal-document-types.js";
import type { LegalDocumentType } from "../legal-document-types.js";

export class ActiveLegalDocumentDto {
  @ApiProperty({ enum: LEGAL_DOCUMENT_TYPES })
  type!: LegalDocumentType;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  contentMd!: string;

  @ApiProperty({ nullable: true })
  publishedAt!: string | null;
}

export class ActiveLegalDocumentsEnvelopeDto {
  @ApiProperty({ type: ActiveLegalDocumentDto, isArray: true })
  data!: ActiveLegalDocumentDto[];
}

export class ConsentDocumentInputDto {
  @ApiProperty({ enum: LEGAL_DOCUMENT_TYPES })
  @IsIn(LEGAL_DOCUMENT_TYPES)
  type!: LegalDocumentType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  version!: string;
}

export class AcceptLegalConsentsRequestDto {
  @ApiProperty({ type: ConsentDocumentInputDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConsentDocumentInputDto)
  documents!: ConsentDocumentInputDto[];
}

export class AcceptLegalConsentsResponseDto {
  @ApiProperty()
  accepted!: boolean;

  @ApiProperty()
  consentRequired!: boolean;
}

export class AcceptLegalConsentsEnvelopeDto {
  @ApiProperty({ type: AcceptLegalConsentsResponseDto })
  data!: AcceptLegalConsentsResponseDto;
}

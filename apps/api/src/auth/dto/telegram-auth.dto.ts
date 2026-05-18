import { IsNotEmpty, IsObject, IsOptional, IsString, Matches } from "class-validator";

const HASH_REGEX = /^[a-f0-9]{64}$/i;

export class TelegramAuthDataDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  photo_url?: string;

  @IsString()
  @IsNotEmpty()
  auth_date!: string;

  @IsString()
  @Matches(HASH_REGEX)
  hash!: string;
}

export class TelegramLoginRequestDto {
  @IsObject()
  telegramAuthData!: TelegramAuthDataDto;
}

export class TelegramMiniAppLoginRequestDto {
  @IsString()
  @IsNotEmpty()
  initData!: string;
}

export class TelegramBotLinkRequestDto {
  @IsString()
  @IsNotEmpty()
  telegramId!: string;

  @IsString()
  @IsOptional()
  telegramUsername?: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;
}

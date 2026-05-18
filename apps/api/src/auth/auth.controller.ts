import { Body, Controller, Headers, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";

import {
  TelegramBotLinkRequestDto,
  TelegramLoginRequestDto,
  TelegramMiniAppLoginRequestDto
} from "./dto/telegram-auth.dto.js";
import { AuthService } from "./auth.service.js";

class AuthenticatedUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: ["user", "admin", "owner"], isArray: true })
  roles!: string[];

  @ApiProperty()
  profileCompleted!: boolean;

  @ApiProperty()
  consentRequired!: boolean;
}

class TelegramAuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}

class TelegramAuthEnvelopeDto {
  @ApiProperty({ type: TelegramAuthResponseDto })
  data!: TelegramAuthResponseDto;
}

class TelegramBotLinkResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  isNewUser!: boolean;

  @ApiProperty()
  profileCompleted!: boolean;
}

class TelegramBotLinkEnvelopeDto {
  @ApiProperty({ type: TelegramBotLinkResponseDto })
  data!: TelegramBotLinkResponseDto;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("telegram")
  @ApiOperation({ summary: "Authenticate user via Telegram login payload" })
  @ApiBody({ type: TelegramLoginRequestDto })
  @ApiOkResponse({ type: TelegramAuthEnvelopeDto })
  async loginTelegram(@Body() body: TelegramLoginRequestDto) {
    return await this.authService.authenticateTelegramWeb(body.telegramAuthData);
  }

  @Post("telegram-mini-app")
  @ApiOperation({ summary: "Authenticate user via Telegram Mini App init data" })
  @ApiBody({ type: TelegramMiniAppLoginRequestDto })
  @ApiOkResponse({ type: TelegramAuthEnvelopeDto })
  async loginTelegramMiniApp(@Body() body: TelegramMiniAppLoginRequestDto) {
    return await this.authService.authenticateTelegramMiniApp(body);
  }

  @Post("telegram-bot/link")
  @ApiOperation({ summary: "Link Telegram bot user to application account" })
  @ApiBody({ type: TelegramBotLinkRequestDto })
  @ApiOkResponse({ type: TelegramBotLinkEnvelopeDto })
  async linkTelegramBotUser(
    @Body() body: TelegramBotLinkRequestDto,
    @Headers("x-telegram-bot-token") botTokenHeader?: string
  ) {
    return await this.authService.linkTelegramBotUser(body, botTokenHeader);
  }
}

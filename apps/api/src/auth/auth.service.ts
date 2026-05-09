import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { AppRole } from "@tabletop-booking/shared";

import type {
  TelegramAuthDataDto,
  TelegramMiniAppLoginRequestDto
} from "./dto/telegram-auth.dto.js";
import { AuthRepository } from "./auth.repository.js";
import { LegalService } from "../legal/legal.service.js";
import {
  verifyTelegramLoginData,
  verifyTelegramMiniAppInitData,
  type VerifiedTelegramIdentity
} from "./telegram-auth-verifier.js";

type AuthResponse = {
  data: {
    accessToken: string;
    user: {
      consentRequired: boolean;
      displayName: string;
      id: string;
      profileCompleted: boolean;
      roles: AppRole[];
    };
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly legalService: LegalService
  ) {}

  async authenticateTelegramWeb(telegramAuthData: TelegramAuthDataDto): Promise<AuthResponse> {
    const botToken = this.requireBotToken();
    const maxAgeSeconds = this.getMaxAgeSeconds();
    const identity = verifyTelegramLoginData(telegramAuthData, botToken, undefined, maxAgeSeconds);
    if (!identity) {
      throw new UnauthorizedException("Invalid Telegram authentication payload");
    }

    return await this.authenticateIdentity(identity);
  }

  async authenticateTelegramMiniApp(
    payload: TelegramMiniAppLoginRequestDto
  ): Promise<AuthResponse> {
    const botToken = this.requireBotToken();
    const maxAgeSeconds = this.getMaxAgeSeconds();
    const identity = verifyTelegramMiniAppInitData(
      payload.initData,
      botToken,
      undefined,
      maxAgeSeconds
    );
    if (!identity) {
      throw new UnauthorizedException("Invalid Telegram authentication payload");
    }

    return await this.authenticateIdentity(identity);
  }

  private async authenticateIdentity(identity: VerifiedTelegramIdentity): Promise<AuthResponse> {
    let user = await this.authRepository.findByTelegramId(identity.telegramId);
    if (!user) {
      user = await this.authRepository.createUserFromTelegramIdentity(identity);
    } else if (user.telegramUsername !== identity.telegramUsername) {
      await this.authRepository.updateTelegramMetadata(user.id, identity.telegramUsername);
      user = {
        ...user,
        telegramUsername: identity.telegramUsername
      };
    }

    const roles = mapDatabaseRolesToAppRoles(user.roles);
    const hasRequiredConsents = await this.legalService.hasAcceptedRequiredConsents(user.id);
    const accessToken = this.issueAccessToken(user.id, roles, identity.telegramId);

    return {
      data: {
        accessToken,
        user: {
          consentRequired: !hasRequiredConsents,
          displayName: user.userProfileDisplayName,
          id: user.id,
          profileCompleted: Boolean(user.phone) && hasRequiredConsents,
          roles
        }
      }
    };
  }

  private issueAccessToken(userId: string, roles: AppRole[], telegramId: string): string {
    const secret = this.configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new ServiceUnavailableException("JWT secret is not configured");
    }

    const rawExpiresIn = this.configService.get<string>("JWT_EXPIRES_IN") || "7d";
    const expiresIn = rawExpiresIn as NonNullable<SignOptions["expiresIn"]>;
    const signOptions: SignOptions = {
      algorithm: "HS256",
      expiresIn
    };

    return jwt.sign(
      {
        roles,
        sub: userId,
        telegramId
      },
      secret,
      signOptions
    );
  }

  private requireBotToken(): string {
    const botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      throw new ServiceUnavailableException("Telegram bot token is not configured");
    }

    return botToken;
  }

  private getMaxAgeSeconds(): number {
    const raw = this.configService.get<string>("TELEGRAM_AUTH_MAX_AGE_SECONDS");
    if (!raw) {
      return 86400;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 86400;
    }

    return parsed;
  }
}

function mapDatabaseRolesToAppRoles(
  userRoles: Array<Exclude<AppRole, "guest">>
): AppRole[] {
  if (userRoles.length === 0) {
    return ["user"];
  }

  return [...new Set(userRoles)];
}

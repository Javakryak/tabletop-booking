import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

@Injectable()
export class BotInternalAuthService {
  constructor(private readonly configService: ConfigService) {}

  assertBotToken(providedBotToken: string | undefined): void {
    const expectedBotToken = this.requireBotToken();
    const provided = providedBotToken?.trim();

    if (!provided) {
      throw new UnauthorizedException("Invalid bot token");
    }

    const expectedBuffer = Buffer.from(expectedBotToken);
    const providedBuffer = Buffer.from(provided);
    const isSameLength = expectedBuffer.length === providedBuffer.length;
    const isValid = isSameLength && timingSafeEqual(expectedBuffer, providedBuffer);

    if (!isValid) {
      throw new UnauthorizedException("Invalid bot token");
    }
  }

  private requireBotToken(): string {
    const botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      throw new ServiceUnavailableException("Telegram bot token is not configured");
    }

    return botToken;
  }
}

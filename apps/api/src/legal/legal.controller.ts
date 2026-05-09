import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import {
  AcceptLegalConsentsEnvelopeDto,
  AcceptLegalConsentsRequestDto,
  ActiveLegalDocumentsEnvelopeDto
} from "./dto/legal.dto.js";
import { LegalService } from "./legal.service.js";

type AuthenticatedRequest = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  user: {
    id: string;
  };
};

@ApiTags("legal")
@Controller("legal")
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get("documents/active")
  @ApiOperation({ summary: "Get active legal documents" })
  @ApiOkResponse({ type: ActiveLegalDocumentsEnvelopeDto })
  async getActiveDocuments() {
    return await this.legalService.getActiveDocuments();
  }

  @Post("consents")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("user", "admin", "owner")
  @ApiOperation({ summary: "Accept legal documents for the authenticated user" })
  @ApiBody({ type: AcceptLegalConsentsRequestDto })
  @ApiOkResponse({ type: AcceptLegalConsentsEnvelopeDto })
  async acceptConsents(
    @Req() request: AuthenticatedRequest,
    @Body() body: AcceptLegalConsentsRequestDto
  ) {
    return await this.legalService.acceptConsents(request.user.id, body, {
      ipAddress: sanitizeIpAddress(resolveIpAddress(request)),
      userAgent: sanitizeUserAgent(resolveUserAgent(request))
    });
  }
}

function resolveUserAgent(request: AuthenticatedRequest): string | null {
  const headerValue = request.headers?.["user-agent"];
  const userAgent = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof userAgent !== "string") {
    return null;
  }

  const trimmed = userAgent.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveIpAddress(request: AuthenticatedRequest): string | null {
  const forwardedHeader = request.headers?.["x-forwarded-for"];
  const forwarded = Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader;
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    const first = forwarded.split(",")[0]?.trim();
    return first && first.length > 0 ? first : null;
  }

  if (typeof request.ip !== "string" || request.ip.trim().length === 0) {
    return null;
  }

  return request.ip.trim();
}

function sanitizeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) {
    return null;
  }

  return userAgent.slice(0, 1024);
}

function sanitizeIpAddress(ipAddress: string | null): string | null {
  if (!ipAddress) {
    return null;
  }

  return ipAddress.slice(0, 64);
}

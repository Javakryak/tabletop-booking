import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
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
import { MeEnvelopeDto, UpdateMePrivacyDto, UpdateMeProfileDto } from "./dto/me.dto.js";
import { MeService } from "./me.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@ApiTags("me")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("user", "admin", "owner")
@Controller("me")
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: "Get current authenticated user profile" })
  @ApiOkResponse({ type: MeEnvelopeDto })
  async getMe(@Req() request: AuthenticatedRequest) {
    return await this.meService.getMe(request.user.id);
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update current authenticated user profile" })
  @ApiBody({ type: UpdateMeProfileDto })
  @ApiOkResponse({ type: MeEnvelopeDto })
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateMeProfileDto
  ) {
    return await this.meService.updateProfile(request.user.id, body);
  }

  @Patch("privacy")
  @ApiOperation({ summary: "Update current authenticated user privacy settings" })
  @ApiBody({ type: UpdateMePrivacyDto })
  @ApiOkResponse({ type: MeEnvelopeDto })
  async updatePrivacy(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateMePrivacyDto
  ) {
    return await this.meService.updatePrivacy(request.user.id, body);
  }
}

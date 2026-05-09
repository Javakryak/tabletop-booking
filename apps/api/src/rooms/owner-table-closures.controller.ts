import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from "@nestjs/common";
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
import { CreateResourceClosureDto, TableClosureEnvelopeDto } from "./dto/closures.dto.js";
import { ClosuresService } from "./closures.service.js";

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@ApiTags("tables")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/tables")
export class OwnerTableClosuresController {
  constructor(private readonly closuresService: ClosuresService) {}

  @Post(":tableId/closures")
  @ApiOperation({ summary: "Create table closure interval (owner only)" })
  @ApiBody({ type: CreateResourceClosureDto })
  @ApiOkResponse({ type: TableClosureEnvelopeDto })
  async createTableClosure(
    @Req() request: AuthenticatedRequest,
    @Param("tableId", new ParseUUIDPipe({ version: "4" })) tableId: string,
    @Body() body: CreateResourceClosureDto
  ) {
    return await this.closuresService.createTableClosure(request.user.id, tableId, body);
  }
}

import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { TablesEnvelopeDto } from "./dto/tables.dto.js";
import { TablesService } from "./tables.service.js";

@ApiTags("tables")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("user", "admin", "owner")
@Controller("rooms")
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get(":roomId/tables")
  @ApiOperation({ summary: "List active tables in a room for authenticated users" })
  @ApiOkResponse({ type: TablesEnvelopeDto })
  async getTablesByRoom(@Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string) {
    return await this.tablesService.getActiveTablesByRoom(roomId);
  }
}

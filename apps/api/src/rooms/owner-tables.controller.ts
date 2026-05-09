import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
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
import { CreateTableDto, TableEnvelopeDto, UpdateTableDto } from "./dto/tables.dto.js";
import { TablesService } from "./tables.service.js";

@ApiTags("tables")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
@Controller("owner/tables")
export class OwnerTablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @ApiOperation({ summary: "Create table (owner only)" })
  @ApiBody({ type: CreateTableDto })
  @ApiOkResponse({ type: TableEnvelopeDto })
  async createTable(@Body() body: CreateTableDto) {
    return await this.tablesService.createTable(body);
  }

  @Patch(":tableId")
  @ApiOperation({ summary: "Update table (owner only)" })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ type: TableEnvelopeDto })
  async updateTable(
    @Param("tableId", new ParseUUIDPipe({ version: "4" })) tableId: string,
    @Body() body: UpdateTableDto
  ) {
    return await this.tablesService.updateTable(tableId, body);
  }

  @Delete(":tableId")
  @ApiOperation({ summary: "Deactivate table (owner only)" })
  @ApiOkResponse({ type: TableEnvelopeDto })
  async deleteTable(@Param("tableId", new ParseUUIDPipe({ version: "4" })) tableId: string) {
    return await this.tablesService.deleteTable(tableId);
  }
}

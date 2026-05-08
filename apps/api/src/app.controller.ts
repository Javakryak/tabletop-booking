import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags
} from "@nestjs/swagger";

import { AppService } from "./app.service.js";
import { EchoDto } from "./dto/echo.dto.js";

class RootPayloadDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  version!: string;
}

class EchoResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
  repeat!: number;
}

@ApiTags("system")
@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Get API bootstrap status payload" })
  @ApiOkResponse({ type: RootPayloadDto })
  getRoot() {
    return this.appService.getRootPayload();
  }

  @Post("echo")
  @ApiOperation({ summary: "Echo message payload for API validation checks" })
  @ApiBody({ type: EchoDto })
  @ApiOkResponse({ type: EchoResponseDto })
  echo(@Body() body: EchoDto) {
    return this.appService.echo(body);
  }
}

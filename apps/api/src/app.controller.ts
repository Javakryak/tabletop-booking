import { Body, Controller, Get, HttpStatus, Inject, Post, Res } from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
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

class HealthCheckDto {
  @ApiProperty({ enum: ["ok", "error"] })
  status!: "ok" | "error";

  @ApiProperty({ required: false })
  message?: string;
}

class HealthChecksDto {
  @ApiProperty({ type: HealthCheckDto })
  api!: HealthCheckDto;

  @ApiProperty({ type: HealthCheckDto })
  database!: HealthCheckDto;

  @ApiProperty({ type: HealthCheckDto })
  redis!: HealthCheckDto;
}

class HealthPayloadDto {
  @ApiProperty({ type: HealthChecksDto })
  checks!: HealthChecksDto;

  @ApiProperty({ enum: ["ok", "degraded"] })
  status!: "ok" | "degraded";

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  version!: string;
}

type HttpResponseShape = {
  status: (code: number) => void;
};

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

  @Get("health")
  @ApiOperation({ summary: "Healthcheck for API, database, and Redis connectivity" })
  @ApiOkResponse({ type: HealthPayloadDto })
  @ApiServiceUnavailableResponse({ type: HealthPayloadDto })
  async getHealth(@Res({ passthrough: true }) response: HttpResponseShape) {
    const payload = await this.appService.getHealthPayload();
    if (payload.status !== "ok") {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return payload;
  }
}

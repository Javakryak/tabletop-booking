import { Body, Controller, Get, Inject, Post } from "@nestjs/common";

import { AppService } from "./app.service.js";
import { EchoDto } from "./dto/echo.dto.js";

@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return this.appService.getRootPayload();
  }

  @Post("echo")
  echo(@Body() body: EchoDto) {
    return this.appService.echo(body);
  }
}

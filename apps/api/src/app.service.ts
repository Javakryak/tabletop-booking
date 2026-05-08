import { Injectable } from "@nestjs/common";

import type { EchoDto } from "./dto/echo.dto.js";

@Injectable()
export class AppService {
  getRootPayload() {
    return {
      name: "tabletop-booking-api",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0"
    };
  }

  echo(body: EchoDto) {
    return {
      message: body.message,
      repeat: body.repeat ?? 1
    };
  }
}

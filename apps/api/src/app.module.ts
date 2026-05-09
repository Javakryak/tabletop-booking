import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthRepository } from "./auth/auth.repository.js";
import { AuthService } from "./auth/auth.service.js";
import { RolesGuard } from "./auth/roles.guard.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]
    })
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, RolesGuard, AuthRepository, AuthService]
})
export class AppModule {}

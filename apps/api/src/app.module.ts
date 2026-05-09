import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthRepository } from "./auth/auth.repository.js";
import { AuthService } from "./auth/auth.service.js";
import { JwtAuthGuard } from "./auth/jwt-auth.guard.js";
import { RolesGuard } from "./auth/roles.guard.js";
import { LegalController } from "./legal/legal.controller.js";
import { LegalRepository } from "./legal/legal.repository.js";
import { LegalService } from "./legal/legal.service.js";
import { MeController } from "./me/me.controller.js";
import { MeRepository } from "./me/me.repository.js";
import { MeService } from "./me/me.service.js";
import { OwnerController } from "./owner/owner.controller.js";
import { OwnerRepository } from "./owner/owner.repository.js";
import { OwnerService } from "./owner/owner.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]
    })
  ],
  controllers: [AppController, AuthController, MeController, LegalController, OwnerController],
  providers: [
    AppService,
    RolesGuard,
    JwtAuthGuard,
    AuthRepository,
    AuthService,
    MeRepository,
    MeService,
    LegalRepository,
    LegalService,
    OwnerRepository,
    OwnerService
  ]
})
export class AppModule {}

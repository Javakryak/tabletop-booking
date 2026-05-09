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
import { OwnerRoomsController } from "./rooms/owner-rooms.controller.js";
import { OwnerTablesController } from "./rooms/owner-tables.controller.js";
import { RoomsController } from "./rooms/rooms.controller.js";
import { RoomsRepository } from "./rooms/rooms.repository.js";
import { RoomsService } from "./rooms/rooms.service.js";
import { TablesController } from "./rooms/tables.controller.js";
import { TablesRepository } from "./rooms/tables.repository.js";
import { TablesService } from "./rooms/tables.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]
    })
  ],
  controllers: [
    AppController,
    AuthController,
    MeController,
    LegalController,
    OwnerController,
    RoomsController,
    OwnerRoomsController,
    TablesController,
    OwnerTablesController
  ],
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
    OwnerService,
    RoomsRepository,
    RoomsService,
    TablesRepository,
    TablesService
  ]
})
export class AppModule {}

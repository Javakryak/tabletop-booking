import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { RolesGuard } from "./auth/roles.guard.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]
    })
  ],
  controllers: [AppController],
  providers: [AppService, RolesGuard]
})
export class AppModule {}

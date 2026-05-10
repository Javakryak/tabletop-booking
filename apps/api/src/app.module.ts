import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthRepository } from "./auth/auth.repository.js";
import { AuthService } from "./auth/auth.service.js";
import { AdminBookingsController } from "./bookings/admin-bookings.controller.js";
import { BookingRulesController } from "./bookings/booking-rules.controller.js";
import { BookingsController } from "./bookings/bookings.controller.js";
import { BookingsRepository } from "./bookings/bookings.repository.js";
import { BookingsService } from "./bookings/bookings.service.js";
import { OwnerBookingRulesController } from "./bookings/owner-booking-rules.controller.js";
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
import { OwnerRoomClosuresController } from "./rooms/owner-room-closures.controller.js";
import { OwnerTableClosuresController } from "./rooms/owner-table-closures.controller.js";
import { OwnerTablesController } from "./rooms/owner-tables.controller.js";
import { RoomsController } from "./rooms/rooms.controller.js";
import { ClosuresRepository } from "./rooms/closures.repository.js";
import { ClosuresService } from "./rooms/closures.service.js";
import { RoomsRepository } from "./rooms/rooms.repository.js";
import { RoomsService } from "./rooms/rooms.service.js";
import { OwnerScheduleController } from "./schedule/owner-schedule.controller.js";
import { OwnerScheduleExceptionsController } from "./schedule/owner-schedule-exceptions.controller.js";
import { ScheduleController } from "./schedule/schedule.controller.js";
import { ScheduleExceptionsController } from "./schedule/schedule-exceptions.controller.js";
import { ScheduleExceptionsRepository } from "./schedule/schedule-exceptions.repository.js";
import { ScheduleExceptionsService } from "./schedule/schedule-exceptions.service.js";
import { ScheduleRepository } from "./schedule/schedule.repository.js";
import { ScheduleService } from "./schedule/schedule.service.js";
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
    AdminBookingsController,
    BookingRulesController,
    BookingsController,
    OwnerBookingRulesController,
    MeController,
    LegalController,
    OwnerController,
    RoomsController,
    OwnerRoomsController,
    OwnerRoomClosuresController,
    TablesController,
    OwnerTablesController,
    OwnerTableClosuresController,
    ScheduleController,
    OwnerScheduleController,
    ScheduleExceptionsController,
    OwnerScheduleExceptionsController
  ],
  providers: [
    AppService,
    RolesGuard,
    JwtAuthGuard,
    AuthRepository,
    AuthService,
    BookingsRepository,
    BookingsService,
    MeRepository,
    MeService,
    LegalRepository,
    LegalService,
    OwnerRepository,
    OwnerService,
    ClosuresRepository,
    ClosuresService,
    RoomsRepository,
    RoomsService,
    TablesRepository,
    TablesService,
    ScheduleRepository,
    ScheduleService,
    ScheduleExceptionsRepository,
    ScheduleExceptionsService
  ]
})
export class AppModule {}

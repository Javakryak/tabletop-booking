import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RolesGuard } from "../src/auth/roles.guard.js";
import { AdminBookingsController } from "../src/bookings/admin-bookings.controller.js";

type RequestShape = {
  user?: {
    roles?: string[];
  };
};

function createContext(
  request: RequestShape,
  handler: keyof AdminBookingsController = "confirmBooking"
) {
  return {
    getClass: () => AdminBookingsController,
    getHandler: () => AdminBookingsController.prototype[handler] as unknown as () => unknown,
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("denies unauthenticated request for admin booking endpoints", () => {
  const guard = new RolesGuard(new Reflector());

  assert.throws(() => guard.canActivate(createContext({}) as never), UnauthorizedException);
});

test("denies non-admin roles for admin booking endpoints", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["user"] } }) as never
  );

  assert.equal(canActivate, false);
});

test("allows admin role for confirm endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["admin"] } }) as never
  );

  assert.equal(canActivate, true);
});

test("allows owner role for cancel endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["owner"] } }, "cancelBooking") as never
  );

  assert.equal(canActivate, true);
});

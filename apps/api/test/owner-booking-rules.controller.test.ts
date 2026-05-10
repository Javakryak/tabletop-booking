import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RolesGuard } from "../src/auth/roles.guard.js";
import { OwnerBookingRulesController } from "../src/bookings/owner-booking-rules.controller.js";

type RequestShape = {
  user?: {
    roles?: string[];
  };
};

function createContext(request: RequestShape) {
  return {
    getClass: () => OwnerBookingRulesController,
    getHandler: () =>
      OwnerBookingRulesController.prototype.updateBookingRules as unknown as () => unknown,
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("denies unauthenticated request for owner booking rules endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  assert.throws(() => guard.canActivate(createContext({}) as never), UnauthorizedException);
});

test("denies non-owner roles for owner booking rules endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["admin"] } }) as never
  );

  assert.equal(canActivate, false);
});

test("allows owner role for owner booking rules endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["owner"] } }) as never
  );

  assert.equal(canActivate, true);
});

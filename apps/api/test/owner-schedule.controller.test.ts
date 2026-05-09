import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RolesGuard } from "../src/auth/roles.guard.js";
import { OwnerScheduleController } from "../src/schedule/owner-schedule.controller.js";

type RequestShape = {
  user?: {
    role?: string;
    roles?: string[];
  };
};

function createContext(
  request: RequestShape,
  handler: keyof OwnerScheduleController = "updateWorkingHours"
) {
  return {
    getClass: () => OwnerScheduleController,
    getHandler: () => OwnerScheduleController.prototype[handler] as unknown as () => unknown,
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("denies unauthenticated request for owner schedule endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  assert.throws(
    () => guard.canActivate(createContext({}) as never),
    UnauthorizedException
  );
});

test("denies non-owner role for owner schedule endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["admin"] } }) as never
  );

  assert.equal(canActivate, false);
});

test("allows owner role for owner schedule endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["owner"] } }) as never
  );

  assert.equal(canActivate, true);
});

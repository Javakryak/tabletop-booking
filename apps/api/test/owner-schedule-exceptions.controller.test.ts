import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RolesGuard } from "../src/auth/roles.guard.js";
import { OwnerScheduleExceptionsController } from "../src/schedule/owner-schedule-exceptions.controller.js";

type RequestShape = {
  user?: {
    role?: string;
    roles?: string[];
  };
};

function createContext(
  request: RequestShape,
  handler: keyof OwnerScheduleExceptionsController = "createScheduleException"
) {
  return {
    getClass: () => OwnerScheduleExceptionsController,
    getHandler: () => OwnerScheduleExceptionsController.prototype[handler] as unknown as () => unknown,
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("denies unauthenticated request for owner schedule exception endpoints", () => {
  const guard = new RolesGuard(new Reflector());

  assert.throws(
    () => guard.canActivate(createContext({}) as never),
    UnauthorizedException
  );
});

test("denies non-owner role for owner schedule exception endpoints", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["admin"] } }, "updateScheduleException") as never
  );

  assert.equal(canActivate, false);
});

test("allows owner role for owner schedule exception endpoints", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createContext({ user: { roles: ["owner"] } }, "deleteScheduleException") as never
  );

  assert.equal(canActivate, true);
});

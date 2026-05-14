import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RolesGuard } from "../src/auth/roles.guard.js";
import { AdminUsersController } from "../src/owner/admin-users.controller.js";

type RequestShape = {
  user?: {
    roles?: string[];
  };
};

function createContext(request: RequestShape) {
  return {
    getClass: () => AdminUsersController,
    getHandler: () =>
      AdminUsersController.prototype.revealEmergencyContact as unknown as () => unknown,
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("denies unauthenticated request for emergency contact reveal endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  assert.throws(() => guard.canActivate(createContext({}) as never), UnauthorizedException);
});

test("denies regular user role for emergency contact reveal endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(createContext({ user: { roles: ["user"] } }) as never);

  assert.equal(canActivate, false);
});

test("allows admin role for emergency contact reveal endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(createContext({ user: { roles: ["admin"] } }) as never);

  assert.equal(canActivate, true);
});

test("allows owner role for emergency contact reveal endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(createContext({ user: { roles: ["owner"] } }) as never);

  assert.equal(canActivate, true);
});

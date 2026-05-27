import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RolesGuard } from "../src/auth/roles.guard.js";
import { AdminUsersController } from "../src/owner/admin-users.controller.js";
import { OwnerUsersController } from "../src/owner/owner-users.controller.js";

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

function createAdminUsersContext(request: RequestShape, methodName: keyof AdminUsersController) {
  return {
    getClass: () => AdminUsersController,
    getHandler: () => AdminUsersController.prototype[methodName] as unknown as () => unknown,
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

function createOwnerUsersContext(request: RequestShape, methodName: keyof OwnerUsersController) {
  return {
    getClass: () => OwnerUsersController,
    getHandler: () => OwnerUsersController.prototype[methodName] as unknown as () => unknown,
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

test("allows admin role for users list endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createAdminUsersContext({ user: { roles: ["admin"] } }, "listUsers") as never
  );

  assert.equal(canActivate, true);
});

test("denies admin role for user block endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createOwnerUsersContext({ user: { roles: ["admin"] } }, "blockUser") as never
  );

  assert.equal(canActivate, false);
});

test("allows owner role for user block and unblock endpoints", () => {
  const guard = new RolesGuard(new Reflector());

  assert.equal(
    guard.canActivate(
      createOwnerUsersContext({ user: { roles: ["owner"] } }, "blockUser") as never
    ),
    true
  );
  assert.equal(
    guard.canActivate(
      createOwnerUsersContext({ user: { roles: ["owner"] } }, "unblockUser") as never
    ),
    true
  );
});

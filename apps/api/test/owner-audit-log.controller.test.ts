import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RolesGuard } from "../src/auth/roles.guard.js";
import { OwnerAuditLogsController } from "../src/owner/owner-audit-logs.controller.js";

type RequestShape = {
  user?: {
    roles?: string[];
  };
};

function createContext(request: RequestShape) {
  return {
    getClass: () => OwnerAuditLogsController,
    getHandler: () => OwnerAuditLogsController.prototype.getAuditLogs as unknown as () => unknown,
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("denies unauthenticated request for owner audit log endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  assert.throws(() => guard.canActivate(createContext({}) as never), UnauthorizedException);
});

test("denies admin role for owner audit log endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(createContext({ user: { roles: ["admin"] } }) as never);

  assert.equal(canActivate, false);
});

test("allows owner role for owner audit log endpoint", () => {
  const guard = new RolesGuard(new Reflector());

  const canActivate = guard.canActivate(createContext({ user: { roles: ["owner"] } }) as never);

  assert.equal(canActivate, true);
});

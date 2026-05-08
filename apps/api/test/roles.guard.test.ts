import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import assert from "node:assert/strict";
import { test } from "node:test";

import { RolesGuard } from "../src/auth/roles.guard.js";

type RequestShape = {
  user?: {
    role?: string;
    roles?: string[];
  };
};

function makeContext(request: RequestShape) {
  return {
    getClass: () => class TestController {},
    getHandler: () => function handler() {},
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("allows request when no roles are required", () => {
  const reflector = {
    getAllAndOverride: () => undefined
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const canActivate = guard.canActivate(makeContext({}) as never);

  assert.equal(canActivate, true);
});

test("denies unauthenticated request for user-only route", () => {
  const reflector = {
    getAllAndOverride: () => ["user"]
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  assert.throws(() => guard.canActivate(makeContext({}) as never), UnauthorizedException);
});

test("allows authenticated user for user-only route", () => {
  const reflector = {
    getAllAndOverride: () => ["user"]
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const canActivate = guard.canActivate(
    makeContext({ user: { role: "user" } }) as never
  );

  assert.equal(canActivate, true);
});

test("denies user role for admin-only route", () => {
  const reflector = {
    getAllAndOverride: () => ["admin"]
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const canActivate = guard.canActivate(
    makeContext({ user: { roles: ["user"] } }) as never
  );

  assert.equal(canActivate, false);
});

test("allows owner role for admin-only route", () => {
  const reflector = {
    getAllAndOverride: () => ["admin"]
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const canActivate = guard.canActivate(
    makeContext({ user: { roles: ["owner"] } }) as never
  );

  assert.equal(canActivate, true);
});

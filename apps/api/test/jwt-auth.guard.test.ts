import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";

import { JwtAuthGuard } from "../src/auth/jwt-auth.guard.js";

const JWT_SECRET = "guard-secret";

type RequestShape = {
  headers?: Record<string, string>;
  user?: {
    id: string;
    roles: string[];
  };
};

function makeContext(request: RequestShape) {
  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("JwtAuthGuard accepts valid bearer token and attaches request.user", () => {
  const token = jwt.sign(
    {
      roles: ["user"]
    },
    JWT_SECRET,
    {
      algorithm: "HS256",
      subject: "user-1"
    }
  );
  const request: RequestShape = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };
  const guard = new JwtAuthGuard(createConfigService(JWT_SECRET) as never);

  const canActivate = guard.canActivate(makeContext(request) as never);

  assert.equal(canActivate, true);
  assert.deepEqual(request.user, {
    id: "user-1",
    roles: ["user"]
  });
});

test("JwtAuthGuard denies request without Authorization header", () => {
  const guard = new JwtAuthGuard(createConfigService(JWT_SECRET) as never);

  assert.throws(() => guard.canActivate(makeContext({}) as never), UnauthorizedException);
});

test("JwtAuthGuard denies invalid bearer token", () => {
  const request: RequestShape = {
    headers: {
      authorization: "Bearer invalid-token"
    }
  };
  const guard = new JwtAuthGuard(createConfigService(JWT_SECRET) as never);

  assert.throws(() => guard.canActivate(makeContext(request) as never), UnauthorizedException);
});

test("JwtAuthGuard fails when JWT secret is not configured", () => {
  const token = jwt.sign(
    {
      roles: ["user"]
    },
    JWT_SECRET,
    {
      algorithm: "HS256",
      subject: "user-1"
    }
  );
  const request: RequestShape = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };
  const guard = new JwtAuthGuard(createConfigService(undefined) as never);

  assert.throws(
    () => guard.canActivate(makeContext(request) as never),
    ServiceUnavailableException
  );
});

function createConfigService(secret: string | undefined) {
  return {
    get(key: string): string | undefined {
      if (key === "JWT_SECRET") {
        return secret;
      }

      return undefined;
    }
  };
}

import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { AppModule } from "../../src/app.module.js";
import { databaseClient } from "../../src/database.js";

let app: INestApplication | null = null;
let baseUrl = "";

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api/v1");
  await app.listen(0, "127.0.0.1");

  const serverAddress = app.getHttpServer().address();
  if (!serverAddress || typeof serverAddress === "string") {
    throw new Error("Unable to resolve integration test server address.");
  }

  baseUrl = `http://127.0.0.1:${serverAddress.port}`;
});

after(async () => {
  if (app) {
    await app.close();
  }

  await databaseClient.$disconnect();
});

test("integration harness uses isolated test database URL", async () => {
  const rows = await databaseClient.$queryRawUnsafe<Array<{ database_name: string }>>(
    "SELECT current_database()::text AS database_name"
  );

  assert.equal(rows.length, 1);
  assert.match(rows[0]?.database_name ?? "", /test/iu);
});

test("API root endpoint responds with bootstrap payload", async () => {
  const response = await fetch(`${baseUrl}/api/v1`);
  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    name?: string;
    status?: string;
    version?: string;
  };

  assert.equal(payload.name, "tabletop-booking-api");
  assert.equal(payload.status, "ok");
  assert.equal(payload.version, "0.1.0");
});

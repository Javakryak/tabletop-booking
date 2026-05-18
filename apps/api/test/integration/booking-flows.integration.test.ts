import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";

import { AppModule } from "../../src/app.module.js";
import { databaseClient } from "../../src/database.js";

const TEST_BOT_TOKEN = "test-bot-token";
const TEST_JWT_SECRET = "test-jwt-secret";
const TEST_LEGAL_VERSION = "2026-05-integration";
const TEST_BOOKING_START = "2030-05-15T12:00:00+03:00";
const TEST_BOOKING_END = "2030-05-15T13:00:00+03:00";
const TEST_MOVED_BOOKING_START = "2030-05-15T13:00:00+03:00";
const TEST_MOVED_BOOKING_END = "2030-05-15T14:00:00+03:00";

process.env.TELEGRAM_BOT_TOKEN = TEST_BOT_TOKEN;
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.JWT_EXPIRES_IN = "1h";
process.env.LEGAL_REQUIRED_DOCUMENT_TYPES = "privacy_policy,personal_data_consent";
process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS = "86400";

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

test("rejects unauthorized booking availability request", async () => {
  const response = await fetch(`${baseUrl}/api/v1/bookings/availability?date=2030-05-15`);

  assert.equal(response.status, 401);
});

test("registers user and executes create/confirm/cancel booking flow", async () => {
  const registration = await authenticateTelegramUser("600001", "integration_user_1");

  assert.equal(typeof registration.data.accessToken, "string");
  assert.equal(registration.data.user.roles[0], "user");

  const userToken = registration.data.accessToken;
  const userId = registration.data.user.id;

  const { alternateTableId, tableId } = await prepareBookingFixture(userId);
  const adminToken = await issueAdminToken();

  const createBookingResponse = await fetch(`${baseUrl}/api/v1/bookings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${userToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      comment: "Integration booking",
      endAt: TEST_BOOKING_END,
      startAt: TEST_BOOKING_START,
      tableId
    })
  });

  assert.equal(createBookingResponse.status, 201);
  const createBookingPayload = (await createBookingResponse.json()) as {
    data: {
      id: string;
      status: string;
      tableId: string;
    };
  };

  assert.equal(createBookingPayload.data.status, "pending");
  assert.equal(createBookingPayload.data.tableId, tableId);

  const queueResponse = await fetch(`${baseUrl}/api/v1/admin/bookings?status=pending`, {
    headers: {
      authorization: `Bearer ${adminToken}`
    }
  });

  assert.equal(queueResponse.status, 200);
  const queuePayload = (await queueResponse.json()) as {
    data: Array<{
      contact: {
        emailMasked: string | null;
        phoneMasked: string | null;
      };
      id: string;
      status: string;
    }>;
  };
  const queueItem = queuePayload.data.find((item) => item.id === createBookingPayload.data.id);
  assert.equal(queueItem?.status, "pending");
  assert.equal(queueItem?.contact.phoneMasked, "+7*** *** **00");
  assert.equal(queueItem?.contact.emailMasked, "i***@example.local");

  const moveResponse = await fetch(
    `${baseUrl}/api/v1/admin/bookings/${createBookingPayload.data.id}/move`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        endAt: TEST_MOVED_BOOKING_END,
        reason: "Integration move",
        startAt: TEST_MOVED_BOOKING_START,
        tableId: alternateTableId
      })
    }
  );

  assert.equal(moveResponse.status, 201);
  const movePayload = (await moveResponse.json()) as {
    data: {
      bookingId: string;
      endAt: string;
      startAt: string;
      status: string;
      tableId: string;
    };
  };
  assert.equal(movePayload.data.bookingId, createBookingPayload.data.id);
  assert.equal(movePayload.data.status, "pending");
  assert.equal(movePayload.data.tableId, alternateTableId);
  assert.equal(movePayload.data.startAt, "2030-05-15T10:00:00.000Z");
  assert.equal(movePayload.data.endAt, "2030-05-15T11:00:00.000Z");

  const moveHistoryRecord = await databaseClient.bookingStatusHistory.findFirst({
    where: {
      bookingId: createBookingPayload.data.id,
      fromStatus: "pending",
      reason: "Integration move",
      toStatus: "pending"
    }
  });
  assert.ok(moveHistoryRecord, "Expected move status-history record to be created");

  const moveAuditRecord = await databaseClient.auditLog.findFirst({
    where: {
      action: "booking.moved",
      entityId: createBookingPayload.data.id,
      entityType: "booking"
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  assert.ok(moveAuditRecord, "Expected move audit log record to be created");
  const moveMetadata = (moveAuditRecord.metadata ?? {}) as { status?: string; tableId?: string };
  assert.equal(moveMetadata.status, "pending");
  assert.equal(moveMetadata.tableId, alternateTableId);

  const moveNotificationSignal = await databaseClient.auditLog.findFirst({
    where: {
      action: "booking.notification_requested",
      entityId: createBookingPayload.data.id,
      entityType: "booking"
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  assert.ok(
    moveNotificationSignal,
    "Expected notification-request audit signal for booking move to be created"
  );
  const notificationMetadata = (moveNotificationSignal.metadata ?? {}) as {
    signal?: string;
    targetUserId?: string;
  };
  assert.equal(notificationMetadata.signal, "booking_moved_user_follow_up");
  assert.equal(notificationMetadata.targetUserId, userId);

  const confirmResponse = await fetch(
    `${baseUrl}/api/v1/admin/bookings/${createBookingPayload.data.id}/confirm`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    }
  );

  assert.equal(confirmResponse.status, 201);
  const confirmPayload = (await confirmResponse.json()) as {
    data: {
      bookingId: string;
      status: string;
    };
  };
  assert.equal(confirmPayload.data.bookingId, createBookingPayload.data.id);
  assert.equal(confirmPayload.data.status, "confirmed");

  const cancelResponse = await fetch(
    `${baseUrl}/api/v1/bookings/${createBookingPayload.data.id}/cancel`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${userToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ reason: "Integration cancellation" })
    }
  );

  assert.equal(cancelResponse.status, 201);
  const cancelPayload = (await cancelResponse.json()) as {
    data: {
      bookingId: string;
      status: string;
    };
  };
  assert.equal(cancelPayload.data.bookingId, createBookingPayload.data.id);
  assert.equal(cancelPayload.data.status, "cancelled_by_user");
});

async function authenticateTelegramUser(telegramId: string, username: string): Promise<{
  data: {
    accessToken: string;
    user: {
      id: string;
      roles: string[];
    };
  };
}> {
  const telegramAuthData = signTelegramLoginPayload({
    auth_date: String(Math.floor(Date.now() / 1000)),
    first_name: "Integration",
    id: telegramId,
    username
  });

  const response = await fetch(`${baseUrl}/api/v1/auth/telegram`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      telegramAuthData
    })
  });

  if (response.status !== 201) {
    const rawBody = await response.text();
    throw new Error(`Unexpected auth status ${response.status}: ${rawBody}`);
  }

  return (await response.json()) as {
    data: {
      accessToken: string;
      user: {
        id: string;
        roles: string[];
      };
    };
  };
}

async function prepareBookingFixture(
  userId: string
): Promise<{ alternateTableId: string; tableId: string }> {
  await databaseClient.bookingRule.create({
    data: {
      allowFullDayBooking: true,
      isActive: true,
      maxActiveBookingsPerUser: 3,
      minBookingDurationMinutes: 30,
      minCancelBeforeMinutes: 120,
      slotStepMinutes: 30
    }
  });

  await databaseClient.clubWorkingHour.createMany({
    data: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      closesAt: new Date("1970-01-01T23:00:00.000Z"),
      dayOfWeek,
      isClosed: false,
      opensAt: new Date("1970-01-01T12:00:00.000Z")
    }))
  });

  const room = await databaseClient.room.create({
    data: {
      name: "Integration room"
    }
  });

  const table = await databaseClient.clubTable.create({
    data: {
      capacity: 4,
      number: "INT-1",
      roomId: room.id
    }
  });
  const alternateTable = await databaseClient.clubTable.create({
    data: {
      capacity: 4,
      number: "INT-2",
      roomId: room.id
    }
  });

  const privacyDocument = await databaseClient.legalDocument.create({
    data: {
      contentMd: "privacy",
      isActive: true,
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      title: "Privacy Policy",
      type: "privacy_policy",
      version: TEST_LEGAL_VERSION
    }
  });

  const consentDocument = await databaseClient.legalDocument.create({
    data: {
      contentMd: "consent",
      isActive: true,
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      title: "Personal Data Consent",
      type: "personal_data_consent",
      version: TEST_LEGAL_VERSION
    }
  });

  await databaseClient.user.update({
    where: {
      id: userId
    },
    data: {
      email: "integration-user@example.local"
    }
  });

  await databaseClient.userProfile.update({
    where: {
      userId
    },
    data: {
      phone: "+70000000000"
    }
  });

  await databaseClient.consent.createMany({
    data: [privacyDocument, consentDocument].map((document) => ({
      acceptedAt: new Date("2026-01-02T00:00:00.000Z"),
      documentType: document.type,
      documentVersion: document.version,
      legalDocumentId: document.id,
      userId
    }))
  });

  return { alternateTableId: alternateTable.id, tableId: table.id };
}

async function issueAdminToken(): Promise<string> {
  const adminUser = await databaseClient.user.create({
    data: {
      profile: {
        create: {
          displayName: "Integration Admin"
        }
      },
      roles: {
        create: [
          {
            role: "admin"
          }
        ]
      },
      telegramId: "700001",
      telegramUsername: "integration_admin"
    }
  });

  return jwt.sign(
    {
      roles: ["admin"],
      sub: adminUser.id
    },
    TEST_JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "1h"
    }
  );
}

function signTelegramLoginPayload(input: Record<string, string>): Record<string, string> {
  const dataCheckString = Object.entries(input)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHash("sha256").update(TEST_BOT_TOKEN).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  return {
    ...input,
    hash
  };
}

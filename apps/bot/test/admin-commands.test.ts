import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ADMIN_BOT_COMMANDS,
  createAdminBookingsFetcher,
  handleAdminCommand,
  handlePendingCommand,
  handleTodayCommand
} from "../src/bot/admin-commands.js";

test("ADMIN_BOT_COMMANDS contains TASK-0904 admin commands", () => {
  const names = ADMIN_BOT_COMMANDS.map((command) => command.command);
  assert.deepEqual(names, ["admin", "pending", "today"]);
});

test("admin commands reject unauthorized users", async () => {
  const replies: string[] = [];
  const context = {
    from: {
      id: 10
    },
    reply: async (text: string) => {
      replies.push(text);
    }
  } as never;

  const dependencies = {
    adminBookingsUrl: "http://localhost:3000/admin/bookings",
    adminTelegramIds: new Set(["999"]),
    appBaseUrl: "http://localhost:3000",
    fetchAdminBookings: async () => [],
    timezone: "Europe/Moscow"
  };

  await handleAdminCommand(context, dependencies);
  await handlePendingCommand(context, dependencies);
  await handleTodayCommand(context, dependencies);

  assert.equal(replies.length, 3);
  for (const reply of replies) {
    assert.match(reply, /только администраторам/i);
  }
});

test("/pending renders booking preview with button", async () => {
  const replies: Array<{ extra?: unknown; text: string }> = [];
  const context = {
    from: {
      id: 42
    },
    reply: async (text: string, extra?: unknown) => {
      replies.push({ extra, text });
    }
  } as never;

  await handlePendingCommand(context, {
    adminBookingsUrl: "http://localhost:3000/admin/bookings",
    adminTelegramIds: new Set(["42"]),
    appBaseUrl: "http://localhost:3000",
    fetchAdminBookings: async () => [
      {
        endAt: "2026-05-19T18:00:00.000Z",
        id: "b-1",
        room: { name: "Зал A" },
        startAt: "2026-05-19T16:00:00.000Z",
        status: "pending",
        table: { number: "3" }
      }
    ],
    timezone: "UTC"
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? "", /Pending-заявки/);
  assert.match(replies[0]?.text ?? "", /Зал A/);
  assert.equal(
    (replies[0]?.extra as { reply_markup?: { inline_keyboard?: Array<Array<{ url?: string }>> } })
      ?.reply_markup?.inline_keyboard?.[0]?.[0]?.url,
    "http://localhost:3000/admin/bookings"
  );
});

test("/today shows bookings for current local day only", async () => {
  const replies: Array<{ text: string }> = [];
  const context = {
    from: {
      id: 77
    },
    reply: async (text: string) => {
      replies.push({ text });
    }
  } as never;

  await handleTodayCommand(context, {
    adminBookingsUrl: "http://localhost:3000/admin/bookings",
    adminTelegramIds: new Set(["77"]),
    appBaseUrl: "http://localhost:3000",
    fetchAdminBookings: async () => [
      {
        endAt: "2026-05-20T10:00:00.000Z",
        id: "b-1",
        startAt: "2026-05-20T09:00:00.000Z",
        status: "confirmed"
      },
      {
        endAt: "2026-05-21T11:00:00.000Z",
        id: "b-2",
        startAt: "2026-05-21T10:00:00.000Z",
        status: "pending"
      }
    ],
    now: () => new Date("2026-05-20T05:00:00.000Z"),
    timezone: "UTC"
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? "", /Брони на сегодня/);
  assert.match(replies[0]?.text ?? "", /confirmed/);
  assert.doesNotMatch(replies[0]?.text ?? "", /pending/);
});

test("createAdminBookingsFetcher calls admin API with bearer token", async () => {
  const calls: Array<{ init: RequestInit | undefined; input: unknown }> = [];
  const fetchMock = async (input: unknown, init?: RequestInit) => {
    calls.push({ init, input });
    return {
      ok: true,
      async json() {
        return {
          data: [
            {
              endAt: "2026-05-20T10:00:00.000Z",
              id: "b-1",
              startAt: "2026-05-20T09:00:00.000Z",
              status: "pending"
            }
          ]
        };
      }
    } as Response;
  };

  const fetchAdminBookings = createAdminBookingsFetcher(
    {
      adminApiToken: "jwt-token",
      apiBaseUrl: "http://localhost:3001/api/v1"
    },
    fetchMock
  );

  const bookings = await fetchAdminBookings({ status: "pending" });

  assert.equal(bookings.length, 1);
  assert.equal(
    calls[0]?.input,
    "http://localhost:3001/api/v1/admin/bookings?status=pending"
  );
  assert.equal(calls[0]?.init?.method, "GET");
  assert.equal(calls[0]?.init?.headers instanceof Headers, true);
  assert.equal((calls[0]?.init?.headers as Headers).get("authorization"), "Bearer jwt-token");
});

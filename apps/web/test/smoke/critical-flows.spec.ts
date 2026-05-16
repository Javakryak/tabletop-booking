import { expect, test } from "@playwright/test";

const AVAILABILITY_ROUTE = /\/api\/v1\/bookings\/availability\?/;
const CREATE_BOOKING_ROUTE = /\/api\/v1\/bookings$/;
const AUTH_ME_ROUTE = /\/api\/v1\/auth\/me$/;
const ADMIN_BOOKINGS_ROUTE = /\/api\/v1\/admin\/bookings\?status=pending$/;
const ADMIN_BOOKING_CONFIRM_ROUTE = /\/api\/v1\/admin\/bookings\/[^/]+\/confirm$/;
const ADMIN_EMERGENCY_CONTACT_ROUTE =
  /\/api\/v1\/admin\/users\/[^/]+\/emergency-contact-access$/;

test("opens the landing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Платформа бронирования клуба" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Смотреть расписание" })
  ).toBeVisible();
});

test("supports demo login path to profile completion", async ({ page }) => {
  await page.goto("/auth/login");

  await page.getByRole("link", { name: "Начать вход через Telegram" }).click();
  await expect(page).toHaveURL(/\/auth\/complete-profile$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Завершите профиль" })
  ).toBeVisible();
  await expect(
    page.getByText("Статус: профиль не завершен. Для продолжения нужно заполнить профиль")
  ).toBeVisible();
});

test("shows unauthenticated state on booking schedule", async ({ page }) => {
  await page.route(AVAILABILITY_ROUTE, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Unauthorized"
      })
    });
  });

  await page.goto("/schedule");

  await expect(
    page.getByText("Чтобы отправлять заявки на бронь, выполните вход через Telegram.")
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Перейти ко входу" })).toBeVisible();
});

test("creates a booking request from schedule", async ({ page }) => {
  let createPayload: unknown = null;

  await page.route(AVAILABILITY_ROUTE, async (route) => {
    const url = new URL(route.request().url());
    const requestedDate = url.searchParams.get("date") ?? "2026-05-15";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          date: requestedDate,
          slotMinutes: 30,
          rooms: [
            {
              id: "room-1",
              name: "Большой зал",
              tables: [
                {
                  id: "table-1",
                  number: "A1",
                  capacity: 6,
                  availableSlots: [
                    {
                      startAt: "2026-05-15T15:00:00.000Z",
                      endAt: "2026-05-15T15:30:00.000Z"
                    }
                  ]
                }
              ]
            }
          ]
        }
      })
    });
  });

  await page.route(CREATE_BOOKING_ROUTE, async (route) => {
    createPayload = route.request().postDataJSON();

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "booking-smoke-1",
          status: "pending",
          tableId: "table-1",
          startAt: "2026-05-15T15:00:00.000Z",
          endAt: "2026-05-15T15:30:00.000Z"
        }
      })
    });
  });

  await page.goto("/schedule");

  await page.getByRole("button", { name: /Большой зал/ }).click();
  await page.getByRole("button", { name: /Стол A1/ }).click();
  await page.getByRole("button", { name: /Слот/ }).first().click();
  await page.getByRole("button", { name: "Отправить заявку" }).click();

  await expect(
    page.getByText(
      "Заявка создана со статусом «pending». Бронирование станет активным после подтверждения администратором."
    )
  ).toBeVisible();
  await expect(page.getByText("Бронь #booking-smoke-1")).toBeVisible();

  expect(createPayload).toEqual({
    tableId: "table-1",
    startAt: "2026-05-15T15:00:00.000Z",
    endAt: "2026-05-15T15:30:00.000Z"
  });
});

test("blocks admin routes for non-admin demo user", async ({ page }) => {
  await page.route(AUTH_ME_ROUTE, async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Not Found"
      })
    });
  });

  await page.goto("/admin/bookings?authenticated=1&role=user");

  await expect(page.getByRole("heading", { name: "Недостаточно прав" })).toBeVisible();
  await expect(
    page.getByText(
      "Этот раздел доступен только администраторам и владельцу клуба."
    )
  ).toBeVisible();
});

test("confirms a booking from admin queue and reveals emergency phone", async ({ page }) => {
  await page.route(AUTH_ME_ROUTE, async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Not Found"
      })
    });
  });

  await page.route(ADMIN_BOOKINGS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "booking-1",
            status: "pending",
            startAt: "2030-05-15T12:00:00.000Z",
            endAt: "2030-05-15T13:00:00.000Z",
            user: {
              id: "user-1",
              displayName: "Иван П.",
              telegramUsername: "ivan_petrov"
            },
            room: {
              id: "room-1",
              name: "Большой зал"
            },
            table: {
              id: "table-1",
              number: "A1"
            },
            contact: {
              phoneMasked: "+7*** *** **67",
              emailMasked: "i***@example.com"
            }
          }
        ]
      })
    });
  });
  await page.route(ADMIN_BOOKING_CONFIRM_ROUTE, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          bookingId: "booking-1",
          status: "confirmed"
        }
      })
    });
  });
  await page.route(ADMIN_EMERGENCY_CONTACT_ROUTE, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          userId: "user-1",
          displayName: "Иван П.",
          telegramUsername: "ivan_petrov",
          phone: "+79990000000",
          auditLogId: "audit-1",
          revealedAt: "2030-05-15T10:00:00.000Z"
        }
      })
    });
  });

  await page.goto("/admin/bookings?authenticated=1&role=admin");

  await expect(page.getByRole("heading", { name: "Очередь броней" })).toBeVisible();
  await page
    .getByPlaceholder("Например: Telegram недоступен, срочное подтверждение")
    .fill("Telegram недоступен, нужно срочно связаться");
  await page.getByRole("button", { name: "Экстренный доступ" }).click();
  await expect(page.getByText("Экстренный доступ к номеру предоставлен и зафиксирован.")).toBeVisible();
  await expect(page.getByText("+79990000000")).toBeVisible();

  await page.getByRole("button", { name: "Подтвердить" }).first().click();

  await expect(page.getByText("Заявка подтверждена.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Недавно обработанные" })).toBeVisible();
});

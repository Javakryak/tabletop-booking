import { InlineKeyboard, type Bot } from "grammy";

import type { BookingNotificationsClient, PendingBookingNotification } from "./booking-notifications-client.js";

export type BookingNotificationsWorkerDependencies = {
  appBaseUrl: string;
  batchSize: number;
  bot: Bot;
  client: BookingNotificationsClient;
  pollIntervalMs: number;
  timezone: string;
};

export function startBookingNotificationsWorker(
  dependencies: BookingNotificationsWorkerDependencies
): { stop: () => void } {
  let isRunning = false;

  const runTick = async () => {
    if (isRunning) {
      return;
    }
    isRunning = true;

    try {
      const pending = await dependencies.client.fetchPending(dependencies.batchSize);
      for (const notification of pending) {
        await processNotification(dependencies, notification);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to process booking notifications batch", {
        error: errorMessage
      });
    } finally {
      isRunning = false;
    }
  };

  const interval = setInterval(() => {
    void runTick();
  }, dependencies.pollIntervalMs);
  void runTick();

  return {
    stop: () => {
      clearInterval(interval);
    }
  };
}

async function processNotification(
  dependencies: BookingNotificationsWorkerDependencies,
  notification: PendingBookingNotification
): Promise<void> {
  try {
    const message = buildNotificationText(notification, dependencies.timezone);
    const keyboard = buildKeyboard(notification, dependencies.appBaseUrl);

    await dependencies.bot.api.sendMessage(notification.recipientTelegramId, message, {
      reply_markup: keyboard
    });
    await dependencies.client.reportDeliveryAttempt({
      notificationType: notification.notificationType,
      recipientUserId: notification.recipientUserId,
      requestId: notification.requestId,
      status: "delivered"
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await safeReportFailure(dependencies, notification, errorMessage);
  }
}

async function safeReportFailure(
  dependencies: BookingNotificationsWorkerDependencies,
  notification: PendingBookingNotification,
  errorMessage: string
): Promise<void> {
  try {
    await dependencies.client.reportDeliveryAttempt({
      failureCode: "send_failed",
      failureMessage: truncate(errorMessage, 500),
      notificationType: notification.notificationType,
      recipientUserId: notification.recipientUserId,
      requestId: notification.requestId,
      status: "failed"
    });
  } catch (reportError) {
    const reportMessage = reportError instanceof Error ? reportError.message : String(reportError);
    console.error("Failed to report notification delivery attempt", {
      error: reportMessage,
      notificationType: notification.notificationType,
      requestId: notification.requestId
    });
  }
}

function buildNotificationText(
  notification: PendingBookingNotification,
  timezone: string
): string {
  const slot = formatSlot(notification.booking.startAt, notification.booking.endAt, timezone);
  const place = `${notification.booking.roomName}, стол ${notification.booking.tableNumber}`;

  if (notification.notificationType === "new_booking_request_admin") {
    return [
      "Новая заявка на бронь.",
      `Время: ${slot}`,
      `Локация: ${place}`,
      "Проверьте и обработайте заявку в админ-панели."
    ].join("\n");
  }

  if (notification.notificationType === "booking_confirmed_user") {
    return [
      "Ваша бронь подтверждена.",
      `Время: ${slot}`,
      `Локация: ${place}`,
      "До встречи в клубе."
    ].join("\n");
  }

  if (notification.notificationType === "booking_cancelled_user") {
    return [
      "Ваша бронь отменена администратором.",
      `Время: ${slot}`,
      `Локация: ${place}`,
      "Если нужно, создайте новую заявку в приложении."
    ].join("\n");
  }

  if (notification.notificationType === "booking_moved_user") {
    return [
      "Параметры вашей брони обновлены администратором.",
      `Новое время: ${slot}`,
      `Локация: ${place}`,
      "Проверьте детали в личном кабинете."
    ].join("\n");
  }

  return [
    "Напоминание о предстоящей игре.",
    `Время: ${slot}`,
    `Локация: ${place}`,
    "Проверьте детали брони в приложении."
  ].join("\n");
}

function buildKeyboard(
  notification: PendingBookingNotification,
  appBaseUrl: string
): InlineKeyboard {
  if (notification.notificationType === "new_booking_request_admin") {
    return new InlineKeyboard().url("Открыть очередь заявок", `${appBaseUrl}/admin/bookings`);
  }

  return new InlineKeyboard().url("Мои бронирования", `${appBaseUrl}/dashboard`);
}

function formatSlot(startAtIso: string, endAtIso: string, timezone: string): string {
  const startAt = new Date(startAtIso);
  const endAt = new Date(endAtIso);
  const startDate = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone
  }).format(startAt);
  const endTime = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone
  }).format(endAt);

  return `${startDate}–${endTime}`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}

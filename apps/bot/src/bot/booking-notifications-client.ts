export type PendingBookingNotification = {
  booking: {
    endAt: string;
    id: string;
    roomName: string;
    startAt: string;
    tableNumber: string;
  };
  notificationType:
    | "new_booking_request_admin"
    | "booking_confirmed_user"
    | "booking_cancelled_user"
    | "booking_moved_user"
    | "booking_reminder_user";
  recipientTelegramId: string;
  recipientUserId: string;
  requestId: string;
};

type PendingNotificationsResponse = {
  data?: PendingBookingNotification[];
};

export type BookingNotificationsClient = {
  fetchPending: (limit: number) => Promise<PendingBookingNotification[]>;
  reportDeliveryAttempt: (input: {
    failureCode?: string;
    failureMessage?: string;
    notificationType: PendingBookingNotification["notificationType"];
    recipientUserId: string;
    requestId: string;
    status: "delivered" | "failed";
  }) => Promise<void>;
};

export function createBookingNotificationsClient(
  config: {
    apiBaseUrl: string;
    botToken: string;
  },
  fetchImpl: typeof fetch = fetch
): BookingNotificationsClient {
  return {
    async fetchPending(limit: number): Promise<PendingBookingNotification[]> {
      const response = await fetchImpl(
        `${config.apiBaseUrl}/internal/bot/booking-notifications/pending?limit=${limit}`,
        {
          headers: new Headers({
            "x-telegram-bot-token": config.botToken
          }),
          method: "GET"
        }
      );
      if (!response.ok) {
        throw new Error(`Pending notifications API request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as PendingNotificationsResponse;
      if (!Array.isArray(payload.data)) {
        throw new Error("Pending notifications API response does not contain data array");
      }

      return payload.data;
    },

    async reportDeliveryAttempt(input): Promise<void> {
      const body: {
        data: {
          failureCode?: string;
          failureMessage?: string;
          notificationType: PendingBookingNotification["notificationType"];
          recipientUserId: string;
          requestId: string;
          status: "delivered" | "failed";
        };
      } = {
        data: {
          notificationType: input.notificationType,
          recipientUserId: input.recipientUserId,
          requestId: input.requestId,
          status: input.status
        }
      };
      if (input.failureCode !== undefined) {
        body.data.failureCode = input.failureCode;
      }
      if (input.failureMessage !== undefined) {
        body.data.failureMessage = input.failureMessage;
      }

      const response = await fetchImpl(
        `${config.apiBaseUrl}/internal/bot/booking-notification-delivered`,
        {
          body: JSON.stringify(body),
          headers: new Headers({
            "content-type": "application/json",
            "x-telegram-bot-token": config.botToken
          }),
          method: "POST"
        }
      );

      if (!response.ok) {
        throw new Error(`Notification delivery API request failed with status ${response.status}`);
      }
    }
  };
}

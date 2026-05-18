"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiRequest } from "@/lib/api-client";

type QueueViewState = "loading" | "ready" | "unauthorized" | "forbidden" | "error";

type QueueBooking = {
  emailMasked: string | null;
  endAt: string;
  id: string;
  roomName: string;
  startAt: string;
  status: string;
  tableNumber: string;
  telegramUsername: string | null;
  userDisplayName: string;
  userId: string | null;
  phoneMasked: string | null;
};

type EmergencyRevealResult = {
  phone: string;
  telegramUsername?: string | null;
};

type ConfirmResponse = {
  status?: string;
  data?: {
    status?: string;
  };
};

type CancelResponse = ConfirmResponse;

function parseString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 4) {
    return "***";
  }

  const tail = digits.slice(-2);
  return `+${digits[0] ?? "7"}*** *** **${tail}`;
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }

  const first = localPart[0] ?? "*";
  return `${first}***@${domain}`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Дата уточняется";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

function normalizeBookingStatus(status: string): string {
  return status.trim().toLowerCase();
}

function getStatusView(status: string): { badgeClassName: string; label: string } {
  const normalized = normalizeBookingStatus(status);
  if (normalized === "pending") {
    return {
      badgeClassName: "border border-amber-600/30 bg-amber-900/20 text-amber-200",
      label: "Ожидает подтверждения"
    };
  }
  if (normalized === "confirmed") {
    return {
      badgeClassName: "border border-emerald-600/30 bg-emerald-900/20 text-emerald-200",
      label: "Подтверждена"
    };
  }
  if (normalized === "cancelled_by_admin") {
    return {
      badgeClassName: "border border-border bg-muted text-muted-foreground",
      label: "Отменена администратором"
    };
  }

  return {
    badgeClassName: "border border-border bg-muted text-muted-foreground",
    label: status
  };
}

function pickArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = parseRecord(payload);
  if (!record) {
    return [];
  }

  if (Array.isArray(record.items)) {
    return record.items;
  }
  if (Array.isArray(record.bookings)) {
    return record.bookings;
  }
  if (Array.isArray(record.data)) {
    return record.data;
  }

  const nestedData = parseRecord(record.data);
  if (nestedData && Array.isArray(nestedData.items)) {
    return nestedData.items;
  }
  if (nestedData && Array.isArray(nestedData.bookings)) {
    return nestedData.bookings;
  }

  return [];
}

function normalizeQueue(payload: unknown): QueueBooking[] {
  return pickArray(payload)
    .map((item) => {
      const record = parseRecord(item);
      if (!record) {
        return null;
      }

      const user = parseRecord(record.user);
      const contact = parseRecord(record.contact);
      const room = parseRecord(record.room);
      const table = parseRecord(record.table);

      const id = parseString(record.id) ?? parseString(record.bookingId);
      const status = parseString(record.status) ?? "pending";
      const startAt = parseString(record.startAt);
      const endAt = parseString(record.endAt);
      const userId = parseString(record.userId) ?? parseString(user?.id);
      const userDisplayName =
        parseString(record.userDisplayName) ??
        parseString(user?.displayName) ??
        "Пользователь";
      const telegramUsername =
        parseString(record.telegramUsername) ?? parseString(user?.telegramUsername);

      const phoneRaw =
        parseString(contact?.phone) ??
        parseString(contact?.phoneMasked) ??
        parseString(record.phone) ??
        parseString(record.phoneMasked) ??
        null;
      const emailRaw =
        parseString(contact?.email) ??
        parseString(contact?.emailMasked) ??
        parseString(record.email) ??
        parseString(record.emailMasked) ??
        null;

      if (!id || !startAt || !endAt) {
        return null;
      }

      const phoneMasked =
        parseString(contact?.phoneMasked) ??
        parseString(record.phoneMasked) ??
        (phoneRaw ? maskPhone(phoneRaw) : null);
      const emailMasked =
        parseString(contact?.emailMasked) ??
        parseString(record.emailMasked) ??
        (emailRaw ? maskEmail(emailRaw) : null);

      return {
        emailMasked,
        endAt,
        id,
        phoneMasked,
        roomName:
          parseString(record.roomName) ?? parseString(room?.name) ?? "Комната не указана",
        startAt,
        status,
        tableNumber:
          parseString(record.tableNumber) ?? parseString(table?.number) ?? "—",
        telegramUsername,
        userDisplayName,
        userId
      } satisfies QueueBooking;
    })
    .filter((item): item is QueueBooking => item !== null);
}

function resolveTransitionStatus(payload: ConfirmResponse | CancelResponse): string | null {
  if (typeof payload.status === "string" && payload.status.length > 0) {
    return payload.status;
  }

  if (payload.data && typeof payload.data.status === "string" && payload.data.status.length > 0) {
    return payload.data.status;
  }

  return null;
}

function resolveEmergencyPhone(payload: unknown): EmergencyRevealResult | null {
  const direct = parseRecord(payload);
  const nested = parseRecord(direct?.data);

  const phone =
    parseString(direct?.phone) ??
    parseString(nested?.phone);
  if (!phone) {
    return null;
  }

  const telegramUsername =
    parseString(direct?.telegramUsername) ??
    parseString(nested?.telegramUsername);

  return {
    phone,
    telegramUsername
  };
}

export function AdminBookingsQueue() {
  const [viewState, setViewState] = useState<QueueViewState>("loading");
  const [bookings, setBookings] = useState<QueueBooking[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loadingNonce, setLoadingNonce] = useState(0);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [cancelReasonByBookingId, setCancelReasonByBookingId] = useState<Record<string, string>>({});
  const [revealReasonByBookingId, setRevealReasonByBookingId] = useState<Record<string, string>>({});
  const [revealedPhonesByBookingId, setRevealedPhonesByBookingId] = useState<Record<string, string>>({});
  const [actionErrorByBookingId, setActionErrorByBookingId] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async () => {
    setViewState("loading");
    setNotice("");
    setErrorMessage("");

    try {
      const payload = await apiRequest<unknown>("/admin/bookings?status=pending");
      const parsed = normalizeQueue(payload);
      setBookings(parsed);
      setViewState("ready");
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.status === 401) {
          setViewState("unauthorized");
          return;
        }

        if (error.status === 403) {
          setViewState("forbidden");
          return;
        }

        setErrorMessage(error.message);
        setViewState("error");
        return;
      }

      setViewState("error");
      setErrorMessage("Не удалось загрузить очередь заявок.");
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue, loadingNonce]);

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => normalizeBookingStatus(booking.status) === "pending"),
    [bookings]
  );
  const processedBookings = useMemo(
    () => bookings.filter((booking) => normalizeBookingStatus(booking.status) !== "pending"),
    [bookings]
  );

  function clearActionError(bookingId: string) {
    setActionErrorByBookingId((previous) => {
      const next = { ...previous };
      delete next[bookingId];
      return next;
    });
  }

  async function handleConfirm(bookingId: string) {
    setProcessingBookingId(bookingId);
    clearActionError(bookingId);
    setNotice("");

    try {
      const response = await apiRequest<ConfirmResponse>(`/admin/bookings/${bookingId}/confirm`, {
        method: "POST"
      });
      const nextStatus = resolveTransitionStatus(response) ?? "confirmed";

      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === bookingId ? { ...booking, status: nextStatus } : booking
        )
      );
      setNotice("Заявка подтверждена.");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setViewState("unauthorized");
        return;
      }
      if (error instanceof ApiRequestError && error.status === 403) {
        setViewState("forbidden");
        return;
      }

      setActionErrorByBookingId((previous) => ({
        ...previous,
        [bookingId]: error instanceof Error ? error.message : "Не удалось подтвердить заявку."
      }));
    } finally {
      setProcessingBookingId(null);
    }
  }

  async function handleCancel(bookingId: string) {
    setProcessingBookingId(bookingId);
    clearActionError(bookingId);
    setNotice("");

    try {
      const reason = cancelReasonByBookingId[bookingId]?.trim();
      const response = await apiRequest<CancelResponse>(`/admin/bookings/${bookingId}/cancel`, {
        body: JSON.stringify({
          reason: reason && reason.length > 0 ? reason : undefined
        }),
        method: "POST"
      });
      const nextStatus = resolveTransitionStatus(response) ?? "cancelled_by_admin";

      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === bookingId ? { ...booking, status: nextStatus } : booking
        )
      );
      setNotice("Заявка отменена.");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setViewState("unauthorized");
        return;
      }
      if (error instanceof ApiRequestError && error.status === 403) {
        setViewState("forbidden");
        return;
      }

      setActionErrorByBookingId((previous) => ({
        ...previous,
        [bookingId]: error instanceof Error ? error.message : "Не удалось отменить заявку."
      }));
    } finally {
      setProcessingBookingId(null);
    }
  }

  async function handleEmergencyReveal(event: FormEvent<HTMLFormElement>, booking: QueueBooking) {
    event.preventDefault();
    if (!booking.userId) {
      setActionErrorByBookingId((previous) => ({
        ...previous,
        [booking.id]: "Для этой заявки нет идентификатора пользователя."
      }));
      return;
    }

    const reason = revealReasonByBookingId[booking.id]?.trim() ?? "";
    if (reason.length < 5) {
      setActionErrorByBookingId((previous) => ({
        ...previous,
        [booking.id]: "Укажите причину экстренного доступа (минимум 5 символов)."
      }));
      return;
    }

    setProcessingBookingId(booking.id);
    clearActionError(booking.id);
    setNotice("");

    try {
      const response = await apiRequest<unknown>(
        `/admin/users/${booking.userId}/emergency-contact-access`,
        {
          body: JSON.stringify({
            reason,
            relatedBookingId: booking.id
          }),
          method: "POST"
        }
      );
      const revealResult = resolveEmergencyPhone(response);
      if (!revealResult) {
        throw new Error("API не вернул номер для экстренного контакта.");
      }

      setRevealedPhonesByBookingId((previous) => ({
        ...previous,
        [booking.id]: revealResult.phone
      }));
      setNotice("Экстренный доступ к номеру предоставлен и зафиксирован.");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setViewState("unauthorized");
        return;
      }
      if (error instanceof ApiRequestError && error.status === 403) {
        setViewState("forbidden");
        return;
      }
      if (error instanceof ApiRequestError && error.status === 404) {
        setActionErrorByBookingId((previous) => ({
          ...previous,
          [booking.id]:
            "Endpoint emergency-contact-access пока недоступен на API. Включите его для audit-logged раскрытия номера."
        }));
        return;
      }

      setActionErrorByBookingId((previous) => ({
        ...previous,
        [booking.id]:
          error instanceof Error
            ? error.message
            : "Не удалось выполнить экстренный доступ к номеру."
      }));
    } finally {
      setProcessingBookingId(null);
    }
  }

  if (viewState === "loading") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Очередь броней</h2>
        <p className="mt-2 text-sm text-muted-foreground">Загрузка заявок...</p>
      </section>
    );
  }

  if (viewState === "unauthorized") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Очередь броней</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Сессия недействительна. Выполните вход заново.
        </p>
      </section>
    );
  }

  if (viewState === "forbidden") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Очередь броней</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Раздел доступен только ролям admin и owner.
        </p>
      </section>
    );
  }

  if (viewState === "error") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Очередь броней</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ошибка загрузки: {errorMessage || "неизвестная ошибка"}
        </p>
        <button
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          onClick={() => setLoadingNonce((previous) => previous + 1)}
          type="button"
        >
          Повторить
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Очередь броней</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Подтверждайте или отменяйте заявки. Контакты по умолчанию показаны в маскированном виде.
        </p>
        {notice ? <p className="mt-3 text-sm text-emerald-200">{notice}</p> : null}
      </header>

      {pendingBookings.length === 0 ? (
        <article className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Новых заявок нет.</p>
        </article>
      ) : (
        <article className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Ожидают решения</h3>
          <ul className="mt-4 space-y-4">
            {pendingBookings.map((booking) => {
              const currentStatus = getStatusView(booking.status);
              const revealedPhone = revealedPhonesByBookingId[booking.id];

              return (
                <li className="rounded-lg border border-border/70 p-4" key={booking.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-base font-medium">{booking.userDisplayName}</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${currentStatus.badgeClassName}`}
                    >
                      {currentStatus.label}
                    </span>
                  </div>

                  <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-foreground">Интервал</dt>
                      <dd>
                        {formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Ресурс</dt>
                      <dd>
                        {booking.roomName}, стол {booking.tableNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Telegram</dt>
                      <dd>
                        {booking.telegramUsername ? `@${booking.telegramUsername}` : "Не указан"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Email</dt>
                      <dd>{booking.emailMasked ?? "Скрыт"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Телефон (маскирован)</dt>
                      <dd>{revealedPhone ?? booking.phoneMasked ?? "Скрыт"}</dd>
                    </div>
                  </dl>

                  <form
                    className="mt-4 space-y-2 rounded-md border border-border/70 p-3"
                    onSubmit={(event) => void handleEmergencyReveal(event, booking)}
                  >
                    <p className="text-sm font-medium">Экстренный доступ к полному телефону</p>
                    <label className="block text-sm">
                      <span className="mb-1 block text-muted-foreground">
                        Причина (будет отправлена в audit flow)
                      </span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          setRevealReasonByBookingId((previous) => ({
                            ...previous,
                            [booking.id]: event.target.value
                          }))
                        }
                        placeholder="Например: Telegram недоступен, срочное подтверждение"
                        value={revealReasonByBookingId[booking.id] ?? ""}
                      />
                    </label>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                      disabled={processingBookingId === booking.id}
                      type="submit"
                    >
                      {processingBookingId === booking.id ? "Запрашиваем..." : "Экстренный доступ"}
                    </button>
                  </form>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                      disabled={processingBookingId === booking.id}
                      onClick={() => void handleConfirm(booking.id)}
                      type="button"
                    >
                      {processingBookingId === booking.id ? "Обрабатываем..." : "Подтвердить"}
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                      disabled={processingBookingId === booking.id}
                      onClick={() => void handleCancel(booking.id)}
                      type="button"
                    >
                      Отменить
                    </button>
                  </div>

                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block text-muted-foreground">Причина отмены (опционально)</span>
                    <input
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        setCancelReasonByBookingId((previous) => ({
                          ...previous,
                          [booking.id]: event.target.value
                        }))
                      }
                      placeholder="Например: конфликт расписания клуба"
                      value={cancelReasonByBookingId[booking.id] ?? ""}
                    />
                  </label>

                  {actionErrorByBookingId[booking.id] ? (
                    <p className="mt-2 text-sm text-amber-200">{actionErrorByBookingId[booking.id]}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </article>
      )}

      {processedBookings.length > 0 ? (
        <article className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Недавно обработанные</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {processedBookings.map((booking) => {
              const status = getStatusView(booking.status);
              return (
                <li className="rounded-md border border-border/70 p-3" key={booking.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{booking.userDisplayName}</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.badgeClassName}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        </article>
      ) : null}
    </section>
  );
}

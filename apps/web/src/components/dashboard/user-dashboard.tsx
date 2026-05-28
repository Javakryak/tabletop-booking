"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiRequest } from "@/lib/api-client";

type PrivacySettings = {
  showPhoneToAdmins: boolean;
  showTelegramUsernameToMeetupParticipants: boolean;
};

type UserProfile = {
  displayName: string;
  email: string | null;
  phone: string | null;
  privacy: PrivacySettings;
  telegramUsername: string | null;
};

type BookingItem = {
  endAt: string;
  id: string;
  roomName?: string;
  startAt: string;
  status: string;
  tableNumber?: string;
};

type MeetupItem = {
  id: string;
  plannedEndAt?: string;
  plannedStartAt?: string;
  status: string;
  title: string;
};

type DashboardState = "loading" | "ready" | "unauthorized" | "error";

type ProfileFormState = {
  displayName: string;
  email: string;
  phone: string;
};

type BookingStatusInfo = {
  badgeClassName: string;
  label: string;
};

function normalizeCollection<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: T[] }).items;
  }

  return [];
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "Дата уточняется";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Дата уточняется";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getBookingStatusInfo(status: string): BookingStatusInfo {
  const normalizedStatus = status.toLowerCase();
  switch (normalizedStatus) {
    case "pending":
      return {
        badgeClassName: "status-chip status-chip--pending",
        label: "Ожидает подтверждения"
      };
    case "confirmed":
      return {
        badgeClassName: "status-chip status-chip--confirmed",
        label: "Подтверждена"
      };
    case "cancelled_by_user":
      return {
        badgeClassName: "status-chip status-chip--neutral",
        label: "Отменена вами"
      };
    case "cancelled_by_admin":
      return {
        badgeClassName: "status-chip status-chip--neutral",
        label: "Отменена администратором"
      };
    case "completed":
      return {
        badgeClassName: "status-chip status-chip--neutral",
        label: "Завершена"
      };
    case "expired":
      return {
        badgeClassName: "status-chip status-chip--neutral",
        label: "Истекла"
      };
    default:
      return {
        badgeClassName: "status-chip status-chip--neutral",
        label: status
      };
  }
}

function canCancelBooking(status: string): boolean {
  return ["pending", "confirmed"].includes(status.toLowerCase());
}

function mapCancelBookingError(error: ApiRequestError): string {
  if (error.status === 403) {
    return "Отмена недоступна для этой брони.";
  }
  if (error.status === 404) {
    return "Бронь не найдена. Обновите страницу.";
  }
  if (error.status === 409) {
    return "Отмена отклонена правилами клуба (например, слишком поздно).";
  }

  return error.message;
}

export function UserDashboard() {
  const [dashboardState, setDashboardState] = useState<DashboardState>("loading");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [meetups, setMeetups] = useState<MeetupItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    displayName: "",
    phone: "",
    email: ""
  });
  const [privacyForm, setPrivacyForm] = useState<PrivacySettings>({
    showPhoneToAdmins: false,
    showTelegramUsernameToMeetupParticipants: false
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string>("");
  const [privacyNotice, setPrivacyNotice] = useState<string>("");
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [bookingNotice, setBookingNotice] = useState<string>("");
  const [bookingErrorById, setBookingErrorById] = useState<Record<string, string>>({});

  const loadDashboard = useCallback(async () => {
    setDashboardState("loading");
    setErrorMessage("");

    try {
      const [profileResult, bookingsResult, meetupsResult] = await Promise.all([
        apiRequest<UserProfile>("/me"),
        apiRequest<unknown>("/bookings/my"),
        apiRequest<unknown>("/meetups")
      ]);

      const bookingItems = normalizeCollection<BookingItem>(bookingsResult);
      const meetupItems = normalizeCollection<MeetupItem>(meetupsResult);

      setProfile(profileResult);
      setBookings(bookingItems);
      setMeetups(meetupItems);
      setProfileForm({
        displayName: profileResult.displayName ?? "",
        phone: profileResult.phone ?? "",
        email: profileResult.email ?? ""
      });
      setPrivacyForm({
        showPhoneToAdmins: profileResult.privacy.showPhoneToAdmins,
        showTelegramUsernameToMeetupParticipants:
          profileResult.privacy.showTelegramUsernameToMeetupParticipants
      });
      setDashboardState("ready");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setDashboardState("unauthorized");
        return;
      }

      setDashboardState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось загрузить данные кабинета"
      );
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const activeBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        ["pending", "confirmed"].includes(booking.status.toLowerCase())
      ),
    [bookings]
  );

  const bookingHistory = useMemo(
    () =>
      bookings.filter(
        (booking) => !["pending", "confirmed"].includes(booking.status.toLowerCase())
      ),
    [bookings]
  );

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileNotice("");
    setProfileSaving(true);

    try {
      const updatedProfile = await apiRequest<UserProfile>("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: profileForm.displayName,
          phone: profileForm.phone || null,
          email: profileForm.email || null
        })
      });

      setProfile(updatedProfile);
      setProfileNotice("Профиль обновлен");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setDashboardState("unauthorized");
      } else {
        setProfileNotice(
          error instanceof Error ? error.message : "Не удалось обновить профиль"
        );
      }
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePrivacySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrivacyNotice("");
    setPrivacySaving(true);

    try {
      const updatedProfile = await apiRequest<UserProfile>("/me/privacy", {
        method: "PATCH",
        body: JSON.stringify({
          showPhoneToAdmins: privacyForm.showPhoneToAdmins,
          showTelegramUsernameToMeetupParticipants:
            privacyForm.showTelegramUsernameToMeetupParticipants
        })
      });

      setProfile(updatedProfile);
      setPrivacyNotice("Настройки приватности сохранены");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setDashboardState("unauthorized");
      } else {
        setPrivacyNotice(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить настройки приватности"
        );
      }
    } finally {
      setPrivacySaving(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setCancelBookingId(bookingId);
    setBookingNotice("");
    setBookingErrorById((previous) => {
      const nextState = { ...previous };
      delete nextState[bookingId];
      return nextState;
    });

    try {
      const updatedBooking = await apiRequest<Partial<BookingItem>>(
        `/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Отменено пользователем из личного кабинета"
          })
        }
      );

      const nextStatus =
        typeof updatedBooking.status === "string" && updatedBooking.status.length > 0
          ? updatedBooking.status
          : "cancelled_by_user";

      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === bookingId ? { ...booking, status: nextStatus } : booking
        )
      );
      setBookingNotice("Бронь отменена.");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setDashboardState("unauthorized");
      } else if (error instanceof ApiRequestError) {
        setBookingErrorById((previous) => ({
          ...previous,
          [bookingId]: mapCancelBookingError(error)
        }));
      } else {
        setBookingErrorById((previous) => ({
          ...previous,
          [bookingId]: "Не удалось отменить бронь. Попробуйте позже."
        }));
      }
    } finally {
      setCancelBookingId(null);
    }
  }

  if (dashboardState === "loading") {
    return (
      <section className="mx-auto max-w-5xl rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.05em]">
          Личный кабинет
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Загрузка данных профиля...</p>
      </section>
    );
  }

  if (dashboardState === "unauthorized") {
    return (
      <section className="mx-auto max-w-5xl rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.05em]">
          Личный кабинет
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Сессия недействительна. Выполните вход заново через Telegram.
        </p>
      </section>
    );
  }

  if (dashboardState === "error") {
    return (
      <section className="mx-auto max-w-5xl rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.05em]">
          Личный кабинет
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ошибка загрузки данных: {errorMessage || "неизвестная ошибка"}
        </p>
        <button
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          onClick={() => void loadDashboard()}
          type="button"
        >
          Повторить
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-xl border border-border bg-card p-6">
        <p className="page-eyebrow">Профиль участника</p>
        <h1 className="text-2xl font-semibold uppercase tracking-[0.05em]">
          Личный кабинет
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          @{profile?.telegramUsername ?? "telegram_user"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Мои активные брони</h2>
          {activeBookings.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Активных броней пока нет.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {activeBookings.map((booking) => (
                <li className="rounded-md border border-border/70 p-3" key={booking.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={getBookingStatusInfo(booking.status).badgeClassName}
                    >
                      {getBookingStatusInfo(booking.status).label}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}
                  </p>
                  <p className="text-muted-foreground">
                    {booking.roomName ?? "Комната не указана"} · стол {booking.tableNumber ?? "-"}
                  </p>
                  {canCancelBooking(booking.status) ? (
                    <div className="mt-3 space-y-2">
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                        disabled={cancelBookingId === booking.id}
                        onClick={() => void handleCancelBooking(booking.id)}
                        type="button"
                      >
                        {cancelBookingId === booking.id ? "Отменяем..." : "Отменить бронь"}
                      </button>
                      {bookingErrorById[booking.id] ? (
                        <p className="text-xs text-[#7a4a00]">{bookingErrorById[booking.id]}</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {bookingNotice ? (
            <p className="mt-3 text-sm text-[#134926]">{bookingNotice}</p>
          ) : null}
        </article>

        <article className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">История бронирований</h2>
          {bookingHistory.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">История пока пустая.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {bookingHistory.map((booking) => (
                <li className="rounded-md border border-border/70 p-3" key={booking.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={getBookingStatusInfo(booking.status).badgeClassName}
                    >
                      {getBookingStatusInfo(booking.status).label}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Мои встречи</h2>
          {meetups.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Вы еще не участвуете во встречах.
            </p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {meetups.map((meetup) => (
                <li className="rounded-md border border-border/70 p-3" key={meetup.id}>
                  <p className="font-medium">{meetup.title}</p>
                  <p className="text-muted-foreground">Статус: {meetup.status}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(meetup.plannedStartAt)} - {formatDateTime(meetup.plannedEndAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Профиль</h2>
          <form className="mt-4 space-y-3" onSubmit={(event) => void handleProfileSubmit(event)}>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Имя</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  setProfileForm((previous) => ({ ...previous, displayName: event.target.value }))
                }
                value={profileForm.displayName}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Телефон</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  setProfileForm((previous) => ({ ...previous, phone: event.target.value }))
                }
                value={profileForm.phone}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Email (необязательно)</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  setProfileForm((previous) => ({ ...previous, email: event.target.value }))
                }
                type="email"
                value={profileForm.email}
              />
            </label>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={profileSaving}
              type="submit"
            >
              Сохранить профиль
            </button>
            {profileNotice ? (
              <p className="text-sm text-muted-foreground">{profileNotice}</p>
            ) : null}
          </form>
        </article>

        <article className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Настройки приватности</h2>
          <form className="mt-4 space-y-3" onSubmit={(event) => void handlePrivacySubmit(event)}>
            <label className="flex items-center gap-3 text-sm">
              <input
                checked={privacyForm.showTelegramUsernameToMeetupParticipants}
                onChange={(event) =>
                  setPrivacyForm((previous) => ({
                    ...previous,
                    showTelegramUsernameToMeetupParticipants: event.target.checked
                  }))
                }
                type="checkbox"
              />
              Показывать Telegram username участникам встреч
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                checked={privacyForm.showPhoneToAdmins}
                onChange={(event) =>
                  setPrivacyForm((previous) => ({
                    ...previous,
                    showPhoneToAdmins: event.target.checked
                  }))
                }
                type="checkbox"
              />
              Разрешить администраторам видеть телефон
            </label>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={privacySaving}
              type="submit"
            >
              Сохранить приватность
            </button>
            {privacyNotice ? (
              <p className="text-sm text-muted-foreground">{privacyNotice}</p>
            ) : null}
          </form>
        </article>
      </div>
    </section>
  );
}

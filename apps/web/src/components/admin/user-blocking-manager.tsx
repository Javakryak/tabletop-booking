"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiRequest } from "@/lib/api-client";
import { extractRolesFromSearchParams, hasOwnerRouteAccess } from "@/lib/role-access";

type ViewState = "loading" | "ready" | "unauthorized" | "forbidden" | "error";

type AdminUser = {
  blockedReason: string | null;
  displayName: string;
  id: string;
  status: string;
  telegramUsername: string | null;
};

type AuthSession = {
  roles?: string[];
};

const DEMO_USERS: AdminUser[] = [
  {
    blockedReason: null,
    displayName: "Иван П.",
    id: "demo-user-1",
    status: "active",
    telegramUsername: "ivan_boardgames"
  },
  {
    blockedReason: "Повторные no-show",
    displayName: "Мария К.",
    id: "demo-user-2",
    status: "blocked",
    telegramUsername: "maria_club"
  }
];

function parseRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseUsers(payload: unknown): AdminUser[] {
  let list: unknown[] = [];

  if (Array.isArray(payload)) {
    list = payload;
  } else {
    const root = parseRecord(payload);
    const data = parseRecord(root?.data);
    if (Array.isArray(root?.data)) {
      list = root.data as unknown[];
    } else if (Array.isArray(root?.items)) {
      list = root.items as unknown[];
    } else if (Array.isArray(root?.users)) {
      list = root.users as unknown[];
    } else if (data && Array.isArray(data.items)) {
      list = data.items as unknown[];
    } else if (data && Array.isArray(data.users)) {
      list = data.users as unknown[];
    }
  }

  return list
    .map((item) => {
      const record = parseRecord(item);
      if (!record) {
        return null;
      }

      const id = parseString(record.id) ?? parseString(record.userId);
      const status = parseString(record.status) ?? "active";
      const displayName =
        parseString(record.displayName) ??
        parseString(parseRecord(record.profile)?.displayName) ??
        "Пользователь";
      const telegramUsername =
        parseString(record.telegramUsername) ??
        parseString(parseRecord(record.telegram)?.username) ??
        null;
      const blockedReason =
        parseString(record.blockedReason) ??
        parseString(record.blockReason) ??
        null;

      if (!id) {
        return null;
      }

      return {
        blockedReason,
        displayName,
        id,
        status,
        telegramUsername
      } satisfies AdminUser;
    })
    .filter((item): item is AdminUser => item !== null);
}

function statusView(status: string): { badgeClassName: string; label: string } {
  const normalized = status.trim().toLowerCase();
  if (normalized === "blocked") {
    return {
      badgeClassName: "status-chip status-chip--blocked",
      label: "Заблокирован"
    };
  }
  if (normalized === "deleted") {
    return {
      badgeClassName: "status-chip status-chip--neutral",
      label: "Удален"
    };
  }

  return {
    badgeClassName: "status-chip status-chip--confirmed",
    label: "Активен"
  };
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function resolveRolesFromLocationFallback(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const params = new URLSearchParams(window.location.search);
  return extractRolesFromSearchParams(params);
}

export function UserBlockingManager() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [reasonByUserId, setReasonByUserId] = useState<Record<string, string>>({});
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (left, right) =>
          left.displayName.localeCompare(right.displayName, "ru") ||
          left.id.localeCompare(right.id)
      ),
    [users]
  );

  const loadUsers = useCallback(async () => {
    setViewState("loading");
    setErrorMessage("");
    setNotice("");

    try {
      let canModerate = false;
      try {
        const session = await apiRequest<AuthSession>("/auth/me");
        const roles = Array.isArray(session.roles) ? session.roles : [];
        canModerate = hasOwnerRouteAccess(roles);
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
          if (error.status === 404) {
            canModerate = hasOwnerRouteAccess(resolveRolesFromLocationFallback());
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      if (!canModerate) {
        setViewState("forbidden");
        return;
      }

      try {
        const payload = await apiRequest<unknown>("/admin/users");
        const parsedUsers = parseUsers(payload);
        setUsers(parsedUsers);
        setViewState("ready");
        setIsDemoMode(false);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          setUsers(DEMO_USERS);
          setViewState("ready");
          setIsDemoMode(true);
          setNotice(
            "Демо-режим: используется локальный список пользователей, так как endpoint /admin/users пока недоступен."
          );
          return;
        }

        throw error;
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setViewState("unauthorized");
        return;
      }
      if (error instanceof ApiRequestError && error.status === 403) {
        setViewState("forbidden");
        return;
      }

      setViewState("error");
      setErrorMessage(resolveErrorMessage(error, "Не удалось загрузить список пользователей."));
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers, reloadNonce]);

  async function handleBlock(user: AdminUser) {
    const reason = (reasonByUserId[user.id] ?? "").trim();
    if (reason.length < 3) {
      setErrorMessage("Укажите причину блокировки минимум из 3 символов.");
      return;
    }

    const confirmed = window.confirm(
      "Заблокировать пользователя? После блокировки он не сможет создавать бронирования и встречи."
    );
    if (!confirmed) {
      return;
    }

    setBusyUserId(user.id);
    setErrorMessage("");
    setNotice("");

    try {
      if (isDemoMode) {
        setUsers((previous) =>
          previous.map((candidate) =>
            candidate.id === user.id
              ? {
                  ...candidate,
                  blockedReason: reason,
                  status: "blocked"
                }
              : candidate
          )
        );
        setNotice(
          "Пользователь заблокирован (демо-режим). В рабочем API это действие должно записываться в audit log."
        );
        return;
      }

      await apiRequest<unknown>(`/owner/users/${user.id}/block`, {
        body: JSON.stringify({ reason }),
        method: "POST"
      });

      setUsers((previous) =>
        previous.map((candidate) =>
          candidate.id === user.id
            ? {
                ...candidate,
                blockedReason: reason,
                status: "blocked"
              }
            : candidate
        )
      );
      setNotice(
        "Пользователь заблокирован. Блокировка должна ограничить создание бронирований и встреч на стороне API."
      );
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, "Не удалось выполнить блокировку пользователя."));
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleUnblock(user: AdminUser) {
    const confirmed = window.confirm("Разблокировать пользователя?");
    if (!confirmed) {
      return;
    }

    setBusyUserId(user.id);
    setErrorMessage("");
    setNotice("");

    try {
      if (isDemoMode) {
        setUsers((previous) =>
          previous.map((candidate) =>
            candidate.id === user.id
              ? {
                  ...candidate,
                  blockedReason: null,
                  status: "active"
                }
              : candidate
          )
        );
        setNotice("Пользователь разблокирован (демо-режим).");
        return;
      }

      await apiRequest<unknown>(`/owner/users/${user.id}/unblock`, {
        method: "POST"
      });

      setUsers((previous) =>
        previous.map((candidate) =>
          candidate.id === user.id
            ? {
                ...candidate,
                blockedReason: null,
                status: "active"
              }
            : candidate
        )
      );
      setNotice("Пользователь разблокирован.");
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, "Не удалось разблокировать пользователя."));
    } finally {
      setBusyUserId(null);
    }
  }

  function onReasonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  if (viewState === "loading") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold uppercase tracking-[0.05em]">
          Блокировка пользователей
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Загрузка данных модерации...</p>
      </section>
    );
  }

  if (viewState === "unauthorized") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold uppercase tracking-[0.05em]">
          Блокировка пользователей
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Сессия недействительна. Выполните вход повторно.
        </p>
      </section>
    );
  }

  if (viewState === "forbidden") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold uppercase tracking-[0.05em]">
          Блокировка пользователей
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Раздел доступен только владельцу клуба (роль owner).
        </p>
      </section>
    );
  }

  if (viewState === "error") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold uppercase tracking-[0.05em]">
          Блокировка пользователей
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ошибка загрузки: {errorMessage || "неизвестная ошибка"}
        </p>
        <button
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          onClick={() => setReloadNonce((previous) => previous + 1)}
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
        <p className="page-eyebrow">Зона владельца</p>
        <h2 className="text-xl font-semibold uppercase tracking-[0.05em]">
          Блокировка пользователей
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Owner-действие: блокировка ограничивает создание бронирований и встреч пользователем.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Важно: блокировка/разблокировка относится к audit-чувствительным операциям и должна фиксироваться на стороне API.
        </p>
        {notice ? <p className="mt-3 text-sm text-[#134926]">{notice}</p> : null}
        {errorMessage ? <p className="mt-3 text-sm text-[#7a4a00]">{errorMessage}</p> : null}
      </header>

      {sortedUsers.length === 0 ? (
        <article className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Пользователи для модерации не найдены.
          </p>
        </article>
      ) : (
        <article className="rounded-xl border border-border bg-card p-6">
          <ul className="space-y-4">
            {sortedUsers.map((user) => {
              const status = statusView(user.status);
              const isBlocked = user.status.trim().toLowerCase() === "blocked";

              return (
                <li className="rounded-md border border-border/70 p-4" key={user.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{user.displayName}</p>
                    <span
                      className={status.badgeClassName}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {user.telegramUsername ? `@${user.telegramUsername}` : "Telegram username не указан"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">ID: {user.id}</p>

                  {isBlocked ? (
                    <p className="mt-2 text-sm text-[#7a4a00]">
                      Статус blocked: пользователь не может создавать бронирования и встречи.
                      {user.blockedReason ? ` Причина: ${user.blockedReason}.` : ""}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      При блокировке пользователь теряет возможность создавать бронирования и встречи.
                    </p>
                  )}

                  {isBlocked ? (
                    <div className="mt-3">
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                        disabled={busyUserId === user.id}
                        onClick={() => void handleUnblock(user)}
                        type="button"
                      >
                        {busyUserId === user.id ? "Обрабатываем..." : "Разблокировать"}
                      </button>
                    </div>
                  ) : (
                    <form className="mt-3 space-y-2" onSubmit={onReasonSubmit}>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        onChange={(event) =>
                          setReasonByUserId((previous) => ({
                            ...previous,
                            [user.id]: event.target.value
                          }))
                        }
                        placeholder="Причина блокировки (например, repeated no-show)"
                        value={reasonByUserId[user.id] ?? ""}
                      />
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                        disabled={busyUserId === user.id}
                        onClick={() => void handleBlock(user)}
                        type="button"
                      >
                        {busyUserId === user.id ? "Блокируем..." : "Заблокировать"}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </article>
      )}
    </section>
  );
}

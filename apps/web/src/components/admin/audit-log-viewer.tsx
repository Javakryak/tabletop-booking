"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiRequest } from "@/lib/api-client";
import { extractRolesFromSearchParams, hasOwnerRouteAccess } from "@/lib/role-access";

type ViewState = "loading" | "ready" | "unauthorized" | "forbidden" | "error";

type AuditEvent = {
  action: string;
  actorDisplayName: string;
  actorUserId: string | null;
  createdAt: string;
  entityId: string | null;
  entityType: string | null;
  id: string;
  metadata: unknown;
};

type AuthSession = {
  roles?: string[];
};

type Filters = {
  action: string;
  actorUserId: string;
  dateFrom: string;
  dateTo: string;
};

const SENSITIVE_KEYS = [
  "phone",
  "email",
  "token",
  "cookie",
  "authorization",
  "password",
  "secret",
  "initdata",
  "telegramauthdata"
];

const DEMO_AUDIT_EVENTS: AuditEvent[] = [
  {
    action: "user.block",
    actorDisplayName: "Owner",
    actorUserId: "owner-demo-1",
    createdAt: "2026-05-11T13:00:00.000Z",
    entityId: "demo-user-2",
    entityType: "user",
    id: "audit-demo-1",
    metadata: {
      reason: "Repeated no-shows"
    }
  },
  {
    action: "booking.confirmed",
    actorDisplayName: "Admin",
    actorUserId: "admin-demo-1",
    createdAt: "2026-05-11T11:30:00.000Z",
    entityId: "demo-booking-1",
    entityType: "booking",
    id: "audit-demo-2",
    metadata: {
      fromStatus: "pending",
      toStatus: "confirmed"
    }
  },
  {
    action: "user.emergency_phone_reveal",
    actorDisplayName: "Owner",
    actorUserId: "owner-demo-1",
    createdAt: "2026-05-10T18:45:00.000Z",
    entityId: "demo-user-1",
    entityType: "user",
    id: "audit-demo-3",
    metadata: {
      context: "Urgent booking confirmation",
      phone: "+79990000000",
      reason: "Telegram unavailable"
    }
  }
];

function parseRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseEvents(payload: unknown): AuditEvent[] {
  let list: unknown[] = [];

  if (Array.isArray(payload)) {
    list = payload;
  } else {
    const root = parseRecord(payload);
    if (root && Array.isArray(root.data)) {
      list = root.data as unknown[];
    } else if (root && Array.isArray(root.items)) {
      list = root.items as unknown[];
    } else if (root && Array.isArray(root.events)) {
      list = root.events as unknown[];
    } else {
      const nested = parseRecord(root?.data);
      if (nested && Array.isArray(nested.items)) {
        list = nested.items as unknown[];
      } else if (nested && Array.isArray(nested.events)) {
        list = nested.events as unknown[];
      }
    }
  }

  const parsed: AuditEvent[] = [];
  for (const item of list) {
    const record = parseRecord(item);
    if (!record) {
      continue;
    }

    const actor = parseRecord(record.actor);
    const entity = parseRecord(record.entity);

    const id = parseString(record.id);
    const action =
      parseString(record.action) ?? parseString(record.eventType) ?? parseString(record.type);
    const createdAt =
      parseString(record.createdAt) ?? parseString(record.timestamp) ?? parseString(record.at);

    if (!id || !action || !createdAt) {
      continue;
    }

    parsed.push({
      action,
      actorDisplayName:
        parseString(record.actorDisplayName) ??
        parseString(actor?.displayName) ??
        parseString(record.actorUserId) ??
        "Неизвестный оператор",
      actorUserId:
        parseString(record.actorUserId) ?? parseString(actor?.id) ?? parseString(actor?.userId),
      createdAt,
      entityId:
        parseString(record.entityId) ?? parseString(entity?.id) ?? parseString(entity?.entityId),
      entityType:
        parseString(record.entityType) ?? parseString(entity?.type) ?? parseString(entity?.entityType),
      id,
      metadata: record.metadata ?? record.meta ?? null
    });
  }

  return parsed;
}

function normalizeAction(action: string): string {
  return action.trim().toLowerCase();
}

function isEmergencyRevealAction(action: string): boolean {
  const normalized = normalizeAction(action);
  return (
    normalized.includes("emergency") ||
    normalized.includes("full_phone") ||
    normalized.includes("phone_reveal")
  );
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Дата неизвестна";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

function sanitizeSensitive(value: unknown, parentKey?: string): unknown {
  const normalizedKey = (parentKey ?? "").toLowerCase();
  const isSensitiveKey = SENSITIVE_KEYS.some((candidate) => normalizedKey.includes(candidate));

  if (value === null || value === undefined) {
    return value;
  }

  if (isSensitiveKey) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    if (SENSITIVE_KEYS.some((candidate) => normalizedKey.includes(candidate))) {
      return "[REDACTED]";
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitive(item, parentKey));
  }

  const record = parseRecord(value);
  if (!record) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(record)) {
    sanitized[key] = sanitizeSensitive(nestedValue, key);
  }

  return sanitized;
}

function metadataPreview(metadata: unknown): string {
  if (metadata === null || metadata === undefined) {
    return "—";
  }

  const sanitized = sanitizeSensitive(metadata);
  if (typeof sanitized === "string") {
    return sanitized;
  }

  try {
    return JSON.stringify(sanitized);
  } catch {
    return "[unserializable]";
  }
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

function readFallbackRolesFromLocation(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  return extractRolesFromSearchParams(new URLSearchParams(window.location.search));
}

export function AuditLogViewer() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    action: "",
    actorUserId: "",
    dateFrom: "",
    dateTo: ""
  });

  const loadEvents = useCallback(async () => {
    setViewState("loading");
    setErrorMessage("");
    setNotice("");

    try {
      let canOpenOwnerAudit = false;
      try {
        const session = await apiRequest<AuthSession>("/auth/me");
        const roles = Array.isArray(session.roles) ? session.roles : [];
        canOpenOwnerAudit = hasOwnerRouteAccess(roles);
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
            canOpenOwnerAudit = hasOwnerRouteAccess(readFallbackRolesFromLocation());
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      if (!canOpenOwnerAudit) {
        setViewState("forbidden");
        return;
      }

      const params = new URLSearchParams();
      if (filters.actorUserId.trim().length > 0) {
        params.set("actorUserId", filters.actorUserId.trim());
      }
      if (filters.dateFrom.trim().length > 0) {
        params.set("from", `${filters.dateFrom}T00:00:00.000Z`);
      }
      if (filters.dateTo.trim().length > 0) {
        params.set("to", `${filters.dateTo}T23:59:59.999Z`);
      }
      const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";

      try {
        const payload = await apiRequest<unknown>(`/owner/audit-logs${suffix}`);
        const parsed = parseEvents(payload);
        setEvents(parsed);
        setViewState("ready");
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          setEvents(DEMO_AUDIT_EVENTS);
          setViewState("ready");
          setNotice(
            "Демо-режим: endpoint /owner/audit-logs пока недоступен в API, показаны локальные audit события."
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
      setErrorMessage(resolveErrorMessage(error, "Не удалось загрузить audit события."));
    }
  }, [filters.actorUserId, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents, reloadNonce]);

  const filteredEvents = useMemo(() => {
    const actionFilter = normalizeAction(filters.action);
    return [...events]
      .filter((event) => {
        if (actionFilter.length === 0) {
          return true;
        }
        return normalizeAction(event.action).includes(actionFilter);
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [events, filters.action]);

  const uniqueActors = useMemo(() => {
    const actors = new Map<string, string>();
    for (const event of events) {
      if (!event.actorUserId) {
        continue;
      }
      if (!actors.has(event.actorUserId)) {
        actors.set(event.actorUserId, `${event.actorDisplayName} (${event.actorUserId})`);
      }
    }

    return [...actors.entries()].map(([id, label]) => ({ id, label }));
  }, [events]);

  const uniqueActions = useMemo(() => {
    return [...new Set(events.map((event) => event.action))].sort((left, right) =>
      left.localeCompare(right, "en")
    );
  }, [events]);

  if (viewState === "loading") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Audit log</h2>
        <p className="mt-2 text-sm text-muted-foreground">Загрузка событий...</p>
      </section>
    );
  }

  if (viewState === "unauthorized") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Audit log</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Сессия недействительна. Выполните вход повторно.
        </p>
      </section>
    );
  }

  if (viewState === "forbidden") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Audit log</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Раздел доступен только владельцу клуба (роль owner).
        </p>
      </section>
    );
  }

  if (viewState === "error") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Audit log</h2>
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
        <h2 className="text-xl font-semibold tracking-tight">Audit log</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Просмотр чувствительных операционных действий. Значения персональных полей
          скрываются в metadata автоматически.
        </p>
        {notice ? <p className="mt-3 text-sm text-emerald-200">{notice}</p> : null}
      </header>

      <article className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Фильтры</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Actor</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  actorUserId: event.target.value
                }))
              }
              value={filters.actorUserId}
            >
              <option value="">Все</option>
              {uniqueActors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Action</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              list="audit-actions"
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  action: event.target.value
                }))
              }
              placeholder="Например: user.block"
              value={filters.action}
            />
            <datalist id="audit-actions">
              {uniqueActions.map((action) => (
                <option key={action} value={action} />
              ))}
            </datalist>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Дата от</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  dateFrom: event.target.value
                }))
              }
              type="date"
              value={filters.dateFrom}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Дата до</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  dateTo: event.target.value
                }))
              }
              type="date"
              value={filters.dateTo}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => setReloadNonce((previous) => previous + 1)}
            type="button"
          >
            Применить / Обновить
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            onClick={() =>
              setFilters({
                action: "",
                actorUserId: "",
                dateFrom: "",
                dateTo: ""
              })
            }
            type="button"
          >
            Сбросить фильтры
          </button>
        </div>
      </article>

      {filteredEvents.length === 0 ? (
        <article className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">События по заданным фильтрам не найдены.</p>
        </article>
      ) : (
        <article className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">События</h3>
          <ul className="mt-4 space-y-3">
            {filteredEvents.map((event) => {
              const isEmergency = isEmergencyRevealAction(event.action);
              return (
                <li className="rounded-md border border-border/70 p-4" key={event.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{event.action}</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        isEmergency
                          ? "border border-rose-600/30 bg-rose-900/20 text-rose-200"
                          : "border border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {isEmergency ? "Emergency Full-Phone Reveal" : "Operational Event"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Actor: {event.actorDisplayName}
                    {event.actorUserId ? ` (${event.actorUserId})` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Entity: {event.entityType ?? "—"}
                    {event.entityId ? ` / ${event.entityId}` : ""}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Metadata (sensitive values redacted)
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-md border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                      {metadataPreview(event.metadata)}
                    </pre>
                  </details>
                </li>
              );
            })}
          </ul>
        </article>
      )}
    </section>
  );
}

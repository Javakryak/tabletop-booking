"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ApiRequestError, apiRequest } from "@/lib/api-client";
import { extractRolesFromSearchParams, hasOwnerRouteAccess } from "@/lib/role-access";

type ViewState = "loading" | "ready" | "unauthorized" | "forbidden" | "error";

type RoomItem = {
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
};

type TableItem = {
  capacity: number;
  id: string;
  isActive: boolean;
  number: string;
  roomId: string;
  sortOrder: number;
};

type WorkingDay = {
  closesAt: string | null;
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null;
};

type WorkingHours = {
  days: WorkingDay[];
  timezone: string;
};

type WorkingHoursDraft = {
  days: DayDraft[];
  timezone: string;
};

type ScheduleException = {
  closesAt: string | null;
  date: string;
  id: string;
  isClosed: boolean;
  opensAt: string | null;
  reason: string | null;
  type: "closed" | "short_day" | "special_hours";
};

type AuthSession = {
  roles?: string[];
};

type RoomDraft = {
  description: string;
  isActive: boolean;
  name: string;
  sortOrder: string;
};

type TableDraft = {
  capacity: string;
  isActive: boolean;
  number: string;
  roomId: string;
  sortOrder: string;
};

type DayDraft = {
  closesAt: string;
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string;
};

type ExceptionDraft = {
  closesAt: string;
  date: string;
  opensAt: string;
  reason: string;
  type: "closed" | "short_day" | "special_hours";
};

const dayNames: Record<number, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье"
};

function sortRooms(rooms: RoomItem[]): RoomItem[] {
  return [...rooms].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "ru")
  );
}

function sortTables(tables: TableItem[]): TableItem[] {
  return [...tables].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.roomId.localeCompare(right.roomId) ||
      left.number.localeCompare(right.number, "ru")
  );
}

function toRoomDraft(room: RoomItem): RoomDraft {
  return {
    description: room.description ?? "",
    isActive: room.isActive,
    name: room.name,
    sortOrder: String(room.sortOrder)
  };
}

function toTableDraft(table: TableItem): TableDraft {
  return {
    capacity: String(table.capacity),
    isActive: table.isActive,
    number: table.number,
    roomId: table.roomId,
    sortOrder: String(table.sortOrder)
  };
}

function toDayDraft(day: WorkingDay): DayDraft {
  return {
    closesAt: day.closesAt ?? "",
    dayOfWeek: day.dayOfWeek,
    isClosed: day.isClosed,
    opensAt: day.opensAt ?? ""
  };
}

function toExceptionDraft(item: ScheduleException): ExceptionDraft {
  return {
    closesAt: item.closesAt ?? "",
    date: item.date,
    opensAt: item.opensAt ?? "",
    reason: item.reason ?? "",
    type: item.type
  };
}

function parseIntOrFallback(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveApiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function OwnerResourcesManager() {
  const searchParams = useSearchParams();
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);

  const [roomDrafts, setRoomDrafts] = useState<Record<string, RoomDraft>>({});
  const [tableDrafts, setTableDrafts] = useState<Record<string, TableDraft>>({});
  const [workingHoursDraft, setWorkingHoursDraft] = useState<WorkingHoursDraft | null>(null);
  const [exceptionDrafts, setExceptionDrafts] = useState<Record<string, ExceptionDraft>>({});

  const [newRoom, setNewRoom] = useState<RoomDraft>({
    description: "",
    isActive: true,
    name: "",
    sortOrder: "0"
  });
  const [newTable, setNewTable] = useState<TableDraft>({
    capacity: "4",
    isActive: true,
    number: "",
    roomId: "",
    sortOrder: "0"
  });
  const [newException, setNewException] = useState<ExceptionDraft>({
    closesAt: "",
    date: "",
    opensAt: "",
    reason: "",
    type: "closed"
  });

  const sortedRooms = useMemo(() => sortRooms(rooms), [rooms]);
  const sortedTables = useMemo(() => sortTables(tables), [tables]);
  const sortedExceptions = useMemo(
    () => [...exceptions].sort((left, right) => left.date.localeCompare(right.date)),
    [exceptions]
  );

  function syncDrafts(
    nextRooms: RoomItem[],
    nextTables: TableItem[],
    nextWorkingHours: WorkingHours,
    nextExceptions: ScheduleException[]
  ) {
    const roomsMap: Record<string, RoomDraft> = {};
    for (const room of nextRooms) {
      roomsMap[room.id] = toRoomDraft(room);
    }
    setRoomDrafts(roomsMap);

    const tablesMap: Record<string, TableDraft> = {};
    for (const table of nextTables) {
      tablesMap[table.id] = toTableDraft(table);
    }
    setTableDrafts(tablesMap);

    setWorkingHoursDraft({
      days: nextWorkingHours.days.map(toDayDraft),
      timezone: nextWorkingHours.timezone
    });

    const exceptionsMap: Record<string, ExceptionDraft> = {};
    for (const item of nextExceptions) {
      exceptionsMap[item.id] = toExceptionDraft(item);
    }
    setExceptionDrafts(exceptionsMap);

    setNewTable((previous) => {
      if (previous.roomId.length > 0 && nextRooms.some((room) => room.id === previous.roomId)) {
        return previous;
      }

      return {
        ...previous,
        roomId: nextRooms[0]?.id ?? ""
      };
    });
  }

  const loadData = useCallback(async () => {
    setViewState("loading");
    setErrorMessage("");

    try {
      let allowOwnerScreens = false;
      try {
        const session = await apiRequest<AuthSession>("/auth/me");
        const roles = Array.isArray(session.roles) ? session.roles : [];
        allowOwnerScreens = hasOwnerRouteAccess(roles);
      } catch (sessionError) {
        if (sessionError instanceof ApiRequestError) {
          if (sessionError.status === 401) {
            setViewState("unauthorized");
            return;
          }
          if (sessionError.status === 403) {
            setViewState("forbidden");
            return;
          }
          if (sessionError.status === 404) {
            const roles = extractRolesFromSearchParams(new URLSearchParams(searchParams.toString()));
            allowOwnerScreens = hasOwnerRouteAccess(roles);
          } else {
            throw sessionError;
          }
        } else {
          throw sessionError;
        }
      }

      if (!allowOwnerScreens) {
        setViewState("forbidden");
        return;
      }

      const [roomsPayload, workingHoursPayload, exceptionsPayload] = await Promise.all([
        apiRequest<{ data: RoomItem[] }>("/rooms"),
        apiRequest<{ data: WorkingHours }>("/schedule/working-hours"),
        apiRequest<{ data: ScheduleException[] }>("/schedule/exceptions")
      ]);

      const loadedRooms = Array.isArray(roomsPayload.data) ? sortRooms(roomsPayload.data) : [];
      const loadedWorkingHours = workingHoursPayload.data;
      const loadedExceptions = Array.isArray(exceptionsPayload.data) ? exceptionsPayload.data : [];

      const tableResults = await Promise.all(
        loadedRooms.map((room) =>
          apiRequest<{ data: TableItem[] }>(`/rooms/${room.id}/tables`).catch((error) => {
            if (error instanceof ApiRequestError && error.status === 404) {
              return { data: [] };
            }
            throw error;
          })
        )
      );
      const loadedTables = sortTables(
        tableResults.flatMap((result) => (Array.isArray(result.data) ? result.data : []))
      );

      setRooms(loadedRooms);
      setTables(loadedTables);
      setExceptions(loadedExceptions);
      syncDrafts(loadedRooms, loadedTables, loadedWorkingHours, loadedExceptions);
      setViewState("ready");
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
      setErrorMessage(resolveApiMessage(error, "Не удалось загрузить owner-раздел."));
    }
  }, [searchParams]);

  useEffect(() => {
    void loadData();
  }, [loadData, reloadNonce]);

  function refreshData(message?: string) {
    if (message) {
      setNotice(message);
    }
    setReloadNonce((previous) => previous + 1);
  }

  function updateRoomDraft(roomId: string, patch: Partial<RoomDraft>) {
    setRoomDrafts((previous) => ({
      ...previous,
      [roomId]: previous[roomId]
        ? {
            ...previous[roomId],
            ...patch
          }
        : {
            description: patch.description ?? "",
            isActive: patch.isActive ?? true,
            name: patch.name ?? "",
            sortOrder: patch.sortOrder ?? "0"
          }
    }));
  }

  function updateTableDraft(tableId: string, patch: Partial<TableDraft>) {
    setTableDrafts((previous) => ({
      ...previous,
      [tableId]: previous[tableId]
        ? {
            ...previous[tableId],
            ...patch
          }
        : {
            capacity: patch.capacity ?? "1",
            isActive: patch.isActive ?? true,
            number: patch.number ?? "",
            roomId: patch.roomId ?? "",
            sortOrder: patch.sortOrder ?? "0"
          }
    }));
  }

  function updateExceptionDraft(exceptionId: string, patch: Partial<ExceptionDraft>) {
    setExceptionDrafts((previous) => ({
      ...previous,
      [exceptionId]: previous[exceptionId]
        ? {
            ...previous[exceptionId],
            ...patch
          }
        : {
            closesAt: patch.closesAt ?? "",
            date: patch.date ?? "",
            opensAt: patch.opensAt ?? "",
            reason: patch.reason ?? "",
            type: patch.type ?? "closed"
          }
    }));
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("room-create");
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: RoomItem }>("/owner/rooms", {
        body: JSON.stringify({
          description: newRoom.description.trim().length > 0 ? newRoom.description.trim() : null,
          isActive: newRoom.isActive,
          name: newRoom.name.trim(),
          sortOrder: parseIntOrFallback(newRoom.sortOrder, 0)
        }),
        method: "POST"
      });
      setNewRoom({
        description: "",
        isActive: true,
        name: "",
        sortOrder: "0"
      });
      refreshData("Комната создана.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось создать комнату."));
    } finally {
      setBusyKey(null);
    }
  }

  async function updateRoom(roomId: string) {
    const draft = roomDrafts[roomId];
    if (!draft) {
      return;
    }

    setBusyKey(`room-update-${roomId}`);
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: RoomItem }>(`/owner/rooms/${roomId}`, {
        body: JSON.stringify({
          description: draft.description.trim().length > 0 ? draft.description.trim() : null,
          isActive: draft.isActive,
          name: draft.name.trim(),
          sortOrder: parseIntOrFallback(draft.sortOrder, 0)
        }),
        method: "PATCH"
      });
      refreshData("Комната обновлена.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось обновить комнату."));
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteRoom(roomId: string) {
    setBusyKey(`room-delete-${roomId}`);
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: RoomItem }>(`/owner/rooms/${roomId}`, {
        method: "DELETE"
      });
      refreshData("Комната деактивирована.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось деактивировать комнату."));
    } finally {
      setBusyKey(null);
    }
  }

  async function createTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("table-create");
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: TableItem }>("/owner/tables", {
        body: JSON.stringify({
          capacity: parseIntOrFallback(newTable.capacity, 1),
          isActive: newTable.isActive,
          number: newTable.number.trim(),
          roomId: newTable.roomId,
          sortOrder: parseIntOrFallback(newTable.sortOrder, 0)
        }),
        method: "POST"
      });
      setNewTable((previous) => ({
        ...previous,
        capacity: "4",
        number: "",
        sortOrder: "0"
      }));
      refreshData("Стол создан.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось создать стол."));
    } finally {
      setBusyKey(null);
    }
  }

  async function updateTable(tableId: string) {
    const draft = tableDrafts[tableId];
    if (!draft) {
      return;
    }

    setBusyKey(`table-update-${tableId}`);
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: TableItem }>(`/owner/tables/${tableId}`, {
        body: JSON.stringify({
          capacity: parseIntOrFallback(draft.capacity, 1),
          isActive: draft.isActive,
          number: draft.number.trim(),
          roomId: draft.roomId,
          sortOrder: parseIntOrFallback(draft.sortOrder, 0)
        }),
        method: "PATCH"
      });
      refreshData("Стол обновлен.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось обновить стол."));
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteTable(tableId: string) {
    setBusyKey(`table-delete-${tableId}`);
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: TableItem }>(`/owner/tables/${tableId}`, {
        method: "DELETE"
      });
      refreshData("Стол деактивирован.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось деактивировать стол."));
    } finally {
      setBusyKey(null);
    }
  }

  async function saveWorkingHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workingHoursDraft) {
      return;
    }

    setBusyKey("hours-save");
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: WorkingHours }>("/owner/schedule/working-hours", {
        body: JSON.stringify({
          days: workingHoursDraft.days.map((day) => ({
            closesAt: day.isClosed ? null : day.closesAt.trim(),
            dayOfWeek: day.dayOfWeek,
            isClosed: day.isClosed,
            opensAt: day.isClosed ? null : day.opensAt.trim()
          })),
          timezone: workingHoursDraft.timezone
        }),
        method: "PUT"
      });
      refreshData("Рабочие часы сохранены.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось сохранить рабочие часы."));
    } finally {
      setBusyKey(null);
    }
  }

  async function createException(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("exception-create");
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: ScheduleException }>("/owner/schedule/exceptions", {
        body: JSON.stringify({
          closesAt: newException.type === "closed" ? null : newException.closesAt.trim(),
          date: newException.date,
          opensAt: newException.type === "closed" ? null : newException.opensAt.trim(),
          reason: newException.reason.trim().length > 0 ? newException.reason.trim() : null,
          type: newException.type
        }),
        method: "POST"
      });
      setNewException({
        closesAt: "",
        date: "",
        opensAt: "",
        reason: "",
        type: "closed"
      });
      refreshData("Исключение добавлено.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось добавить исключение."));
    } finally {
      setBusyKey(null);
    }
  }

  async function updateException(exceptionId: string) {
    const draft = exceptionDrafts[exceptionId];
    if (!draft) {
      return;
    }

    setBusyKey(`exception-update-${exceptionId}`);
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: ScheduleException }>(`/owner/schedule/exceptions/${exceptionId}`, {
        body: JSON.stringify({
          closesAt: draft.type === "closed" ? null : draft.closesAt.trim(),
          opensAt: draft.type === "closed" ? null : draft.opensAt.trim(),
          reason: draft.reason.trim().length > 0 ? draft.reason.trim() : null,
          type: draft.type
        }),
        method: "PATCH"
      });
      refreshData("Исключение обновлено.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось обновить исключение."));
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteException(exceptionId: string) {
    setBusyKey(`exception-delete-${exceptionId}`);
    setNotice("");
    setErrorMessage("");

    try {
      await apiRequest<{ data: ScheduleException }>(`/owner/schedule/exceptions/${exceptionId}`, {
        method: "DELETE"
      });
      refreshData("Исключение удалено.");
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, "Не удалось удалить исключение."));
    } finally {
      setBusyKey(null);
    }
  }

  if (viewState === "loading") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Управление ресурсами клуба</h2>
        <p className="mt-2 text-sm text-muted-foreground">Загружаем данные owner-панели...</p>
      </section>
    );
  }

  if (viewState === "unauthorized") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Управление ресурсами клуба</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Сессия недействительна. Выполните вход повторно.
        </p>
      </section>
    );
  }

  if (viewState === "forbidden") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Управление ресурсами клуба</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Раздел доступен только владельцу клуба (роль owner).
        </p>
      </section>
    );
  }

  if (viewState === "error") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Управление ресурсами клуба</h2>
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
    <section className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Управление ресурсами клуба</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Owner-раздел: комнаты, столы, недельный график и исключения расписания.
        </p>
        {notice ? <p className="mt-3 text-sm text-emerald-200">{notice}</p> : null}
        {errorMessage ? <p className="mt-3 text-sm text-amber-200">{errorMessage}</p> : null}
      </header>

      <article className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Комнаты</h3>
        <form className="mt-4 grid gap-2 sm:grid-cols-4" onSubmit={(event) => void createRoom(event)}>
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => setNewRoom((previous) => ({ ...previous, name: event.target.value }))}
            placeholder="Название"
            required
            value={newRoom.name}
          />
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) =>
              setNewRoom((previous) => ({ ...previous, description: event.target.value }))
            }
            placeholder="Описание (опционально)"
            value={newRoom.description}
          />
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => setNewRoom((previous) => ({ ...previous, sortOrder: event.target.value }))}
            placeholder="Sort order"
            type="number"
            value={newRoom.sortOrder}
          />
          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            disabled={busyKey === "room-create"}
            type="submit"
          >
            {busyKey === "room-create" ? "Создаем..." : "Добавить комнату"}
          </button>
        </form>

        {sortedRooms.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Пока нет активных комнат.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedRooms.map((room) => {
              const draft = roomDrafts[room.id];
              if (!draft) {
                return null;
              }

              return (
                <li className="rounded-md border border-border/70 p-3" key={room.id}>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateRoomDraft(room.id, {
                          name: event.target.value
                        })
                      }
                      value={draft.name}
                    />
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateRoomDraft(room.id, {
                          description: event.target.value
                        })
                      }
                      value={draft.description}
                    />
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateRoomDraft(room.id, {
                          sortOrder: event.target.value
                        })
                      }
                      type="number"
                      value={draft.sortOrder}
                    />
                    <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
                      <input
                        checked={draft.isActive}
                        onChange={(event) =>
                          updateRoomDraft(room.id, {
                            isActive: event.target.checked
                          })
                        }
                        type="checkbox"
                      />
                      Активна
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                      disabled={busyKey === `room-update-${room.id}`}
                      onClick={() => void updateRoom(room.id)}
                      type="button"
                    >
                      Сохранить
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                      disabled={busyKey === `room-delete-${room.id}`}
                      onClick={() => void deleteRoom(room.id)}
                      type="button"
                    >
                      Деактивировать
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </article>

      <article className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Столы</h3>
        <form className="mt-4 grid gap-2 sm:grid-cols-5" onSubmit={(event) => void createTable(event)}>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => setNewTable((previous) => ({ ...previous, roomId: event.target.value }))}
            required
            value={newTable.roomId}
          >
            <option value="">Выберите комнату</option>
            {sortedRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => setNewTable((previous) => ({ ...previous, number: event.target.value }))}
            placeholder="Номер стола"
            required
            value={newTable.number}
          />
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            min={1}
            onChange={(event) =>
              setNewTable((previous) => ({ ...previous, capacity: event.target.value }))
            }
            placeholder="Вместимость"
            type="number"
            value={newTable.capacity}
          />
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) =>
              setNewTable((previous) => ({ ...previous, sortOrder: event.target.value }))
            }
            placeholder="Sort order"
            type="number"
            value={newTable.sortOrder}
          />
          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            disabled={busyKey === "table-create"}
            type="submit"
          >
            {busyKey === "table-create" ? "Создаем..." : "Добавить стол"}
          </button>
        </form>

        {sortedTables.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">В активных комнатах пока нет столов.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedTables.map((table) => {
              const draft = tableDrafts[table.id];
              if (!draft) {
                return null;
              }

              return (
                <li className="rounded-md border border-border/70 p-3" key={table.id}>
                  <div className="grid gap-2 sm:grid-cols-5">
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateTableDraft(table.id, {
                          roomId: event.target.value
                        })
                      }
                      value={draft.roomId}
                    >
                      {sortedRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateTableDraft(table.id, {
                          number: event.target.value
                        })
                      }
                      value={draft.number}
                    />
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      min={1}
                      onChange={(event) =>
                        updateTableDraft(table.id, {
                          capacity: event.target.value
                        })
                      }
                      type="number"
                      value={draft.capacity}
                    />
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateTableDraft(table.id, {
                          sortOrder: event.target.value
                        })
                      }
                      type="number"
                      value={draft.sortOrder}
                    />
                    <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
                      <input
                        checked={draft.isActive}
                        onChange={(event) =>
                          updateTableDraft(table.id, {
                            isActive: event.target.checked
                          })
                        }
                        type="checkbox"
                      />
                      Активен
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                      disabled={busyKey === `table-update-${table.id}`}
                      onClick={() => void updateTable(table.id)}
                      type="button"
                    >
                      Сохранить
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                      disabled={busyKey === `table-delete-${table.id}`}
                      onClick={() => void deleteTable(table.id)}
                      type="button"
                    >
                      Деактивировать
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </article>

      <article className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Рабочие часы</h3>
        {!workingHoursDraft ? (
          <p className="mt-2 text-sm text-muted-foreground">Данные расписания недоступны.</p>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={(event) => void saveWorkingHours(event)}>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Timezone</span>
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  setWorkingHoursDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          timezone: event.target.value
                        }
                      : previous
                  )
                }
                value={workingHoursDraft.timezone}
              />
            </label>

            <ul className="space-y-2">
              {workingHoursDraft.days
                .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
                .map((day) => (
                  <li className="rounded-md border border-border/70 p-3" key={day.dayOfWeek}>
                    <p className="text-sm font-medium">{dayNames[day.dayOfWeek] ?? day.dayOfWeek}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
                        <input
                          checked={day.isClosed}
                          onChange={(event) =>
                            setWorkingHoursDraft((previous) =>
                              previous
                                ? {
                                    ...previous,
                                    days: previous.days.map((candidate) =>
                                      candidate.dayOfWeek === day.dayOfWeek
                                        ? {
                                            ...candidate,
                                            isClosed: event.target.checked
                                          }
                                        : candidate
                                    )
                                  }
                                : previous
                            )
                          }
                          type="checkbox"
                        />
                        Выходной
                      </label>
                      <input
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        disabled={day.isClosed}
                        onChange={(event) =>
                          setWorkingHoursDraft((previous) =>
                            previous
                              ? {
                                  ...previous,
                                  days: previous.days.map((candidate) =>
                                    candidate.dayOfWeek === day.dayOfWeek
                                      ? {
                                          ...candidate,
                                          opensAt: event.target.value
                                        }
                                      : candidate
                                  )
                                }
                              : previous
                          )
                        }
                        type="time"
                        value={day.opensAt}
                      />
                      <input
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        disabled={day.isClosed}
                        onChange={(event) =>
                          setWorkingHoursDraft((previous) =>
                            previous
                              ? {
                                  ...previous,
                                  days: previous.days.map((candidate) =>
                                    candidate.dayOfWeek === day.dayOfWeek
                                      ? {
                                          ...candidate,
                                          closesAt: event.target.value
                                        }
                                      : candidate
                                  )
                                }
                              : previous
                          )
                        }
                        type="time"
                        value={day.closesAt}
                      />
                    </div>
                  </li>
                ))}
            </ul>

            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              disabled={busyKey === "hours-save"}
              type="submit"
            >
              {busyKey === "hours-save" ? "Сохраняем..." : "Сохранить рабочие часы"}
            </button>
          </form>
        )}
      </article>

      <article className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Исключения расписания</h3>
        <form className="mt-4 grid gap-2 sm:grid-cols-5" onSubmit={(event) => void createException(event)}>
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) =>
              setNewException((previous) => ({ ...previous, date: event.target.value }))
            }
            required
            type="date"
            value={newException.date}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) =>
              setNewException((previous) => ({
                ...previous,
                type: event.target.value as ExceptionDraft["type"]
              }))
            }
            value={newException.type}
          >
            <option value="closed">closed</option>
            <option value="short_day">short_day</option>
            <option value="special_hours">special_hours</option>
          </select>
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            disabled={newException.type === "closed"}
            onChange={(event) =>
              setNewException((previous) => ({ ...previous, opensAt: event.target.value }))
            }
            type="time"
            value={newException.opensAt}
          />
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            disabled={newException.type === "closed"}
            onChange={(event) =>
              setNewException((previous) => ({ ...previous, closesAt: event.target.value }))
            }
            type="time"
            value={newException.closesAt}
          />
          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            disabled={busyKey === "exception-create"}
            type="submit"
          >
            {busyKey === "exception-create" ? "Добавляем..." : "Добавить"}
          </button>
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:col-span-5"
            onChange={(event) =>
              setNewException((previous) => ({ ...previous, reason: event.target.value }))
            }
            placeholder="Причина (опционально)"
            value={newException.reason}
          />
        </form>

        {sortedExceptions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Пока нет исключений расписания.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedExceptions.map((item) => {
              const draft = exceptionDrafts[item.id];
              if (!draft) {
                return null;
              }

              return (
                <li className="rounded-md border border-border/70 p-3" key={item.id}>
                  <div className="grid gap-2 sm:grid-cols-5">
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      disabled
                      value={draft.date}
                    />
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateExceptionDraft(item.id, {
                          type: event.target.value as ExceptionDraft["type"]
                        })
                      }
                      value={draft.type}
                    >
                      <option value="closed">closed</option>
                      <option value="short_day">short_day</option>
                      <option value="special_hours">special_hours</option>
                    </select>
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      disabled={draft.type === "closed"}
                      onChange={(event) =>
                        updateExceptionDraft(item.id, {
                          opensAt: event.target.value
                        })
                      }
                      type="time"
                      value={draft.opensAt}
                    />
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      disabled={draft.type === "closed"}
                      onChange={(event) =>
                        updateExceptionDraft(item.id, {
                          closesAt: event.target.value
                        })
                      }
                      type="time"
                      value={draft.closesAt}
                    />
                    <input
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        updateExceptionDraft(item.id, {
                          reason: event.target.value
                        })
                      }
                      placeholder="Причина"
                      value={draft.reason}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                      disabled={busyKey === `exception-update-${item.id}`}
                      onClick={() => void updateException(item.id)}
                      type="button"
                    >
                      Сохранить
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                      disabled={busyKey === `exception-delete-${item.id}`}
                      onClick={() => void deleteException(item.id)}
                      type="button"
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}

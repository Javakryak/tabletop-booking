"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  BookingCalendar,
  type BookingRoomOption,
  type BookingSelection,
  type BookingSlotOption,
  type BookingTableOption
} from "@/components/booking";
import { Button } from "@/components/ui/button";
import { ApiRequestError, apiRequest } from "@/lib/api-client";

type AvailabilitySlot = {
  startAt: string;
  endAt: string;
};

type AvailabilityTable = {
  id: string;
  number: string;
  capacity: number;
  availableSlots: AvailabilitySlot[];
};

type AvailabilityRoom = {
  id: string;
  name: string;
  tables: AvailabilityTable[];
};

type AvailabilityData = {
  date: string;
  slotMinutes: number;
  rooms: AvailabilityRoom[];
};

type CreateBookingResponse = {
  id: string;
  status: "pending";
  tableId: string;
  startAt: string;
  endAt: string;
};

type SubmissionState = "idle" | "submitting" | "success" | "error";
type ViewState = "loading" | "ready" | "unauthenticated" | "error";

function getTodayIso(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(isoValue: string): string {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDateTime(isoValue: string): string {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "Дата уточняется";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getSlotId(slot: AvailabilitySlot): string {
  return `${slot.startAt}__${slot.endAt}`;
}

function ensureSelectionStillValid(
  selection: BookingSelection,
  rooms: AvailabilityRoom[]
): BookingSelection {
  const room = rooms.find((item) => item.id === selection.roomId) ?? null;
  if (!room) {
    return {
      ...selection,
      roomId: null,
      tableId: null,
      slotIds: []
    };
  }

  const table = room.tables.find((item) => item.id === selection.tableId) ?? null;
  if (!table) {
    return {
      ...selection,
      tableId: null,
      slotIds: []
    };
  }

  const validSlotIds = new Set(table.availableSlots.map((slot) => getSlotId(slot)));
  return {
    ...selection,
    slotIds: selection.slotIds.filter((slotId) => validSlotIds.has(slotId))
  };
}

function mapBookingMessage(error: ApiRequestError): string {
  const message = error.message;

  if (error.status === 409) {
    if (message.includes("Active booking limit")) {
      return "Достигнут лимит активных броней. Дождитесь завершения текущих броней.";
    }

    return "Выбранный стол уже недоступен на это время. Выберите другой слот.";
  }

  if (error.status === 401) {
    return "Сессия истекла. Выполните вход через Telegram и повторите попытку.";
  }

  if (error.status === 403) {
    if (message.includes("Phone number is required")) {
      return "Перед созданием брони добавьте телефон в профиле.";
    }
    if (message.includes("Required legal consents")) {
      return "Перед бронированием примите обязательные согласия в профиле.";
    }

    return "Недостаточно прав для выполнения этого действия.";
  }

  if (error.status === 400) {
    return `Проверьте выбранные данные: ${message}`;
  }

  if (error.status === 404) {
    return "Выбранный стол больше недоступен. Обновите выбор и попробуйте снова.";
  }

  return message;
}

function resolveSelectionInterval(
  selectedSlots: BookingSlotOption[],
  slotMinutes: number
): { startAt: string; endAt: string } | { error: string } {
  if (selectedSlots.length === 0) {
    return { error: "Выберите хотя бы один слот." };
  }

  const prepared = selectedSlots
    .map((slot) => ({
      startAt: slot.startAt,
      endAt: slot.endAt,
      startTime: new Date(slot.startAt).getTime(),
      endTime: new Date(slot.endAt).getTime()
    }))
    .sort((left, right) => left.startTime - right.startTime);

  if (
    prepared.some(
      (slot) =>
        Number.isNaN(slot.startTime) || Number.isNaN(slot.endTime) || slot.endTime <= slot.startTime
    )
  ) {
    return { error: "Не удалось обработать выбранные слоты. Обновите страницу." };
  }

  const slotDurationMs = slotMinutes * 60_000;
  let previousSlot: (typeof prepared)[number] | null = null;
  for (const slot of prepared) {
    if (slot.endTime - slot.startTime !== slotDurationMs) {
      return { error: "Выберите слоты одной длительности и повторите попытку." };
    }
    if (previousSlot && previousSlot.endTime !== slot.startTime) {
      return { error: "Слоты должны быть непрерывными, без разрывов по времени." };
    }
    previousSlot = slot;
  }

  const firstSlot = prepared[0];
  const lastSlot = prepared[prepared.length - 1];
  if (!firstSlot || !lastSlot) {
    return { error: "Выберите хотя бы один слот." };
  }

  return {
    startAt: firstSlot.startAt,
    endAt: lastSlot.endAt
  };
}

export function BookingCreationFlow() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [availabilityReloadNonce, setAvailabilityReloadNonce] = useState(0);
  const [selection, setSelection] = useState<BookingSelection>({
    date: getTodayIso(),
    roomId: null,
    tableId: null,
    slotIds: []
  });
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");

  const [comment, setComment] = useState("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [createdBooking, setCreatedBooking] = useState<CreateBookingResponse | null>(null);
  const [localValidationMessage, setLocalValidationMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setViewState((current) => (current === "ready" ? "ready" : "loading"));
      setAvailabilityError("");

      try {
        const data = await apiRequest<AvailabilityData>(
          `/bookings/availability?date=${encodeURIComponent(selection.date)}`
        );
        if (cancelled) {
          return;
        }

        setAvailability(data);
        setSelection((current) => ensureSelectionStillValid(current, data.rooms));
        setViewState("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiRequestError && error.status === 401) {
          setViewState("unauthenticated");
          return;
        }

        setViewState("error");
        setAvailabilityError(
          error instanceof ApiRequestError
            ? mapBookingMessage(error)
            : "Не удалось загрузить доступные слоты."
        );
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [availabilityReloadNonce, selection.date]);

  const rooms = useMemo<BookingRoomOption[]>(
    () =>
      (availability?.rooms ?? []).map((room) => ({
        id: room.id,
        name: room.name,
        tableCount: room.tables.length
      })),
    [availability]
  );

  const tables = useMemo<BookingTableOption[]>(() => {
    const room = availability?.rooms.find((item) => item.id === selection.roomId);
    if (!room) {
      return [];
    }

    return room.tables.map((table) => ({
      id: table.id,
      label: `Стол ${table.number}`,
      capacity: table.capacity
    }));
  }, [availability, selection.roomId]);

  const slots = useMemo<BookingSlotOption[]>(() => {
    const room = availability?.rooms.find((item) => item.id === selection.roomId);
    if (!room) {
      return [];
    }

    const table = room.tables.find((item) => item.id === selection.tableId);
    if (!table) {
      return [];
    }

    return table.availableSlots.map((slot) => ({
      id: getSlotId(slot),
      label: "Слот",
      startAt: formatTime(slot.startAt),
      endAt: formatTime(slot.endAt)
    }));
  }, [availability, selection.roomId, selection.tableId]);

  const canSubmit =
    viewState === "ready" &&
    submissionState !== "submitting" &&
    selection.roomId !== null &&
    selection.tableId !== null &&
    selection.slotIds.length > 0;

  async function handleSubmit() {
    setSubmissionMessage("");
    setCreatedBooking(null);
    setLocalValidationMessage("");

    if (!selection.tableId) {
      setSubmissionState("error");
      setLocalValidationMessage("Выберите стол перед отправкой заявки.");
      return;
    }

    const room = availability?.rooms.find((item) => item.id === selection.roomId) ?? null;
    const table = room?.tables.find((item) => item.id === selection.tableId) ?? null;
    if (!table) {
      setSubmissionState("error");
      setLocalValidationMessage("Выбранный стол больше недоступен. Обновите выбор.");
      return;
    }

    const selectedApiSlots = table.availableSlots
      .filter((slot) => selection.slotIds.includes(getSlotId(slot)))
      .map((slot) => ({
        id: getSlotId(slot),
        label: "slot",
        startAt: slot.startAt,
        endAt: slot.endAt
      }));

    const resolvedInterval = resolveSelectionInterval(
      selectedApiSlots,
      availability?.slotMinutes ?? 30
    );
    if ("error" in resolvedInterval) {
      setSubmissionState("error");
      setLocalValidationMessage(resolvedInterval.error);
      return;
    }

    setSubmissionState("submitting");

    try {
      const created = await apiRequest<CreateBookingResponse>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          tableId: selection.tableId,
          startAt: resolvedInterval.startAt,
          endAt: resolvedInterval.endAt,
          comment: comment.trim().length > 0 ? comment.trim() : undefined
        })
      });

      setCreatedBooking(created);
      setSubmissionState("success");
      setSubmissionMessage(
        "Заявка создана со статусом «pending». Бронирование станет активным после подтверждения администратором."
      );
      setAvailabilityReloadNonce((current) => current + 1);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setViewState("unauthenticated");
        return;
      }

      setSubmissionState("error");
      setSubmissionMessage(
        error instanceof ApiRequestError
          ? mapBookingMessage(error)
          : "Не удалось отправить заявку. Попробуйте позже."
      );
    }
  }

  if (viewState === "unauthenticated") {
    return (
      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Бронирование стола</h1>
        <p className="text-sm text-muted-foreground">
          Чтобы отправлять заявки на бронь, выполните вход через Telegram.
        </p>
        <div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            href="/auth/login"
          >
            Перейти ко входу
          </Link>
        </div>
      </section>
    );
  }

  if (viewState === "error") {
    return (
      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Бронирование стола</h1>
        <p className="text-sm text-muted-foreground">
          {availabilityError || "Не удалось загрузить данные бронирования."}
        </p>
        <div>
          <Button
            onClick={() => setAvailabilityReloadNonce((current) => current + 1)}
            type="button"
            variant="outline"
          >
            Повторить загрузку
          </Button>
        </div>
      </section>
    );
  }

  const summaryStatus =
    submissionState === "success"
      ? "ready"
      : !selection.roomId || !selection.tableId || selection.slotIds.length === 0
        ? "invalid"
        : "idle";

  return (
    <div className="space-y-4">
      <BookingCalendar
        onSelectionChange={(nextSelection) => {
          setSelection(nextSelection);
          setSubmissionState("idle");
          setSubmissionMessage("");
          setLocalValidationMessage("");
        }}
        roomState={{
          isLoading: viewState === "loading",
          emptyMessage: "Комнаты с доступными слотами на эту дату не найдены."
        }}
        rooms={rooms}
        selection={selection}
        slotState={{
          isLoading: viewState === "loading",
          emptyMessage: selection.tableId
            ? "Для выбранного стола нет свободных слотов."
            : "Сначала выберите стол."
        }}
        slotValidationMessage={localValidationMessage}
        slots={slots}
        summaryStatus={summaryStatus}
        summaryUnavailableMessage={availabilityError || undefined}
        summaryValidationMessage="Выберите комнату, стол и хотя бы один слот."
        tableState={{
          isLoading: viewState === "loading",
          emptyMessage: selection.roomId
            ? "В выбранной комнате пока нет доступных столов."
            : "Сначала выберите комнату."
        }}
        tables={tables}
      />

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <label className="block space-y-2 text-sm" htmlFor="booking-comment">
          <span className="font-medium">Комментарий к заявке (необязательно)</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            id="booking-comment"
            maxLength={1000}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Например, формат игры или состав участников"
            value={comment}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!canSubmit} onClick={() => void handleSubmit()} type="button">
            {submissionState === "submitting" ? "Отправляем..." : "Отправить заявку"}
          </Button>
          <p className="text-xs text-muted-foreground">
            После отправки заявка получает статус pending до подтверждения администратором.
          </p>
        </div>

        {submissionState === "error" && submissionMessage ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {submissionMessage}
          </p>
        ) : null}

        {submissionState === "success" && submissionMessage ? (
          <div className="space-y-2 rounded-md border border-emerald-600/30 bg-emerald-900/20 px-3 py-3 text-sm text-emerald-100">
            <p>{submissionMessage}</p>
            {createdBooking ? (
              <p className="text-emerald-200/90">
                Бронь #{createdBooking.id}: {formatDateTime(createdBooking.startAt)} -{" "}
                {formatDateTime(createdBooking.endAt)}.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

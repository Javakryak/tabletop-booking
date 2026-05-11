"use client";

import { useMemo, useState } from "react";

import {
  BookingCalendar,
  type BookingRoomOption,
  type BookingSelection,
  type BookingSlotOption,
  type BookingTableOption
} from "@/components/booking";
import { Button } from "@/components/ui/button";

type AvailabilityMode = "ready" | "loading" | "empty" | "unavailable";

const ROOM_OPTIONS: BookingRoomOption[] = [
  {
    id: "room-main",
    name: "Основной зал",
    tableCount: 6,
    description: "Быстрые партии и клубные встречи"
  },
  {
    id: "room-wargame",
    name: "Варгейм-комната",
    tableCount: 4,
    description: "Глубокие игровые сессии"
  },
  {
    id: "room-event",
    name: "Турнирный зал",
    tableCount: 2,
    description: "Отдельные окна под турниры",
    isUnavailable: true,
    unavailableReason: "Закрыт на подготовку к мероприятию"
  }
];

const TABLES_BY_ROOM: Record<string, BookingTableOption[]> = {
  "room-main": [
    { id: "table-m1", label: "Стол M1", capacity: 4, locationHint: "У окна" },
    { id: "table-m2", label: "Стол M2", capacity: 6, locationHint: "У стены" },
    {
      id: "table-m3",
      label: "Стол M3",
      capacity: 4,
      locationHint: "Центральный ряд",
      isUnavailable: true,
      unavailableReason: "Временное обслуживание"
    }
  ],
  "room-wargame": [
    { id: "table-w1", label: "Стол W1", capacity: 6, locationHint: "Большое поле" },
    { id: "table-w2", label: "Стол W2", capacity: 8, locationHint: "Зона миниатюр" }
  ],
  "room-event": []
};

const SLOTS_BY_TABLE: Record<string, BookingSlotOption[]> = {
  "table-m1": [
    { id: "slot-18-00", label: "Вечерний слот", startAt: "18:00", endAt: "19:30" },
    { id: "slot-19-30", label: "Вечерний слот", startAt: "19:30", endAt: "21:00" },
    {
      id: "slot-21-00",
      label: "Поздний слот",
      startAt: "21:00",
      endAt: "22:30",
      isUnavailable: true,
      unavailableReason: "Технический перерыв"
    }
  ],
  "table-m2": [
    { id: "slot-m2-18-00", label: "Вечерний слот", startAt: "18:00", endAt: "20:00" },
    { id: "slot-m2-20-00", label: "Поздний слот", startAt: "20:00", endAt: "22:00" }
  ],
  "table-m3": [],
  "table-w1": [
    { id: "slot-w1-12-00", label: "Дневной слот", startAt: "12:00", endAt: "15:00" },
    { id: "slot-w1-15-00", label: "Дневной слот", startAt: "15:00", endAt: "18:00" }
  ],
  "table-w2": [
    { id: "slot-w2-13-00", label: "Турнирный слот", startAt: "13:00", endAt: "17:00" }
  ]
};

function getTodayIso(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function BookingCalendarDemo() {
  const [mode, setMode] = useState<AvailabilityMode>("ready");
  const [selection, setSelection] = useState<BookingSelection>({
    date: getTodayIso(),
    roomId: "room-main",
    tableId: "table-m1",
    slotIds: []
  });

  const tables = useMemo(() => {
    if (!selection.roomId) {
      return [];
    }

    return TABLES_BY_ROOM[selection.roomId] ?? [];
  }, [selection.roomId]);

  const slots = useMemo(() => {
    if (!selection.tableId) {
      return [];
    }

    return SLOTS_BY_TABLE[selection.tableId] ?? [];
  }, [selection.tableId]);

  const roomState = {
    isLoading: mode === "loading",
    isUnavailable: mode === "unavailable",
    emptyMessage: "Комнаты еще не опубликованы для выбранной даты."
  };

  const tableState = {
    isLoading: mode === "loading",
    isUnavailable: mode === "unavailable",
    emptyMessage: selection.roomId
      ? "В комнате пока нет доступных столов."
      : "Сначала выберите комнату."
  };

  const slotState = {
    isLoading: mode === "loading",
    isUnavailable: mode === "unavailable",
    emptyMessage: selection.tableId
      ? "Слоты для выбранного стола закончились."
      : "Сначала выберите стол."
  };

  const summaryStatus =
    mode === "unavailable"
      ? "unavailable"
      : !selection.roomId || !selection.tableId || selection.slotIds.length === 0
        ? "invalid"
        : "ready";

  const calendarRooms = mode === "empty" ? [] : ROOM_OPTIONS;
  const calendarTables = mode === "empty" ? [] : tables;
  const calendarSlots = mode === "empty" ? [] : slots;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold">Режим данных</h2>
        <p className="text-sm text-muted-foreground">
          Переключатель имитирует ответы API для проверки состояний интерфейса.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setMode("ready")}
            type="button"
            variant={mode === "ready" ? "default" : "outline"}
          >
            Готово
          </Button>
          <Button
            onClick={() => setMode("loading")}
            type="button"
            variant={mode === "loading" ? "default" : "outline"}
          >
            Загрузка
          </Button>
          <Button
            onClick={() => setMode("empty")}
            type="button"
            variant={mode === "empty" ? "default" : "outline"}
          >
            Пусто
          </Button>
          <Button
            onClick={() => setMode("unavailable")}
            type="button"
            variant={mode === "unavailable" ? "default" : "outline"}
          >
            Недоступно
          </Button>
        </div>
      </section>

      <BookingCalendar
        onSelectionChange={setSelection}
        roomState={roomState}
        rooms={calendarRooms}
        selection={selection}
        slotState={slotState}
        slotValidationMessage={
          summaryStatus === "invalid" ? "Выберите минимум один временной слот." : undefined
        }
        slots={calendarSlots}
        summaryStatus={summaryStatus}
        summaryUnavailableMessage="Сервис бронирования временно недоступен. Попробуйте позже."
        summaryValidationMessage="Чтобы продолжить, выберите комнату, стол и хотя бы один слот."
        tableState={tableState}
        tables={calendarTables}
      />
    </div>
  );
}

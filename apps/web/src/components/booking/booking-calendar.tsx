"use client";

import { CalendarDays } from "lucide-react";

import { BookingSummary } from "./booking-summary";
import { RoomSelector } from "./room-selector";
import { SlotPicker } from "./slot-picker";
import { TableSelector } from "./table-selector";
import type {
  BookingRoomOption,
  BookingSelection,
  BookingSlotOption,
  BookingTableOption
} from "./types";

type SelectorState = {
  isLoading?: boolean | undefined;
  isUnavailable?: boolean | undefined;
  unavailableMessage?: string | undefined;
  emptyMessage?: string | undefined;
};

type BookingCalendarProps = {
  selection: BookingSelection;
  rooms: BookingRoomOption[];
  tables: BookingTableOption[];
  slots: BookingSlotOption[];
  onSelectionChange: (selection: BookingSelection) => void;
  roomState?: SelectorState | undefined;
  tableState?: SelectorState | undefined;
  slotState?: SelectorState | undefined;
  slotValidationMessage?: string | undefined;
  summaryStatus?: "idle" | "invalid" | "unavailable" | "ready" | undefined;
  summaryValidationMessage?: string | undefined;
  summaryUnavailableMessage?: string | undefined;
};

function toggleSlot(slotId: string, selectedSlotIds: string[]): string[] {
  if (selectedSlotIds.includes(slotId)) {
    return selectedSlotIds.filter((id) => id !== slotId);
  }

  return [...selectedSlotIds, slotId];
}

export function BookingCalendar({
  selection,
  rooms,
  tables,
  slots,
  onSelectionChange,
  roomState,
  tableState,
  slotState,
  slotValidationMessage,
  summaryStatus = "idle",
  summaryValidationMessage,
  summaryUnavailableMessage
}: BookingCalendarProps) {
  const selectedRoom = rooms.find((room) => room.id === selection.roomId) ?? null;
  const selectedTable = tables.find((table) => table.id === selection.tableId) ?? null;
  const selectedSlots = slots.filter((slot) => selection.slotIds.includes(slot.id));

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Бронирование стола</h1>
        <p className="text-sm text-muted-foreground">
          Выберите дату, комнату, стол и слоты. Проверка доступности и создание
          заявки выполняются через API.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="space-y-2">
            <label
              className="inline-flex items-center gap-2 text-base font-semibold"
              htmlFor="booking-date"
            >
              <CalendarDays aria-hidden className="h-4 w-4" />
              Дата
            </label>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              id="booking-date"
              onChange={(event) =>
                onSelectionChange({
                  ...selection,
                  date: event.target.value,
                  slotIds: []
                })
              }
              type="date"
              value={selection.date}
            />
          </section>

          <RoomSelector
            emptyMessage={roomState?.emptyMessage}
            isLoading={roomState?.isLoading}
            isUnavailable={roomState?.isUnavailable}
            onSelectRoom={(roomId) =>
              onSelectionChange({
                ...selection,
                roomId,
                tableId: null,
                slotIds: []
              })
            }
            rooms={rooms}
            selectedRoomId={selection.roomId}
            unavailableMessage={roomState?.unavailableMessage}
          />

          <TableSelector
            emptyMessage={tableState?.emptyMessage}
            isLoading={tableState?.isLoading}
            isUnavailable={tableState?.isUnavailable}
            onSelectTable={(tableId) =>
              onSelectionChange({
                ...selection,
                tableId,
                slotIds: []
              })
            }
            selectedTableId={selection.tableId}
            tables={tables}
            unavailableMessage={tableState?.unavailableMessage}
          />

          <SlotPicker
            emptyMessage={slotState?.emptyMessage}
            isLoading={slotState?.isLoading}
            isUnavailable={slotState?.isUnavailable}
            onToggleSlot={(slotId) =>
              onSelectionChange({
                ...selection,
                slotIds: toggleSlot(slotId, selection.slotIds)
              })
            }
            selectedSlotIds={selection.slotIds}
            slots={slots}
            unavailableMessage={slotState?.unavailableMessage}
            validationMessage={slotValidationMessage}
          />
        </div>

        <BookingSummary
          selectedRoom={selectedRoom}
          selectedSlots={selectedSlots}
          selectedTable={selectedTable}
          selection={selection}
          status={summaryStatus}
          unavailableMessage={summaryUnavailableMessage}
          validationMessage={summaryValidationMessage}
        />
      </div>
    </section>
  );
}

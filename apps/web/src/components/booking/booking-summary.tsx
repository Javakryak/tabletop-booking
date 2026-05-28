import { CalendarDays, CheckCircle2, CircleDashed, TriangleAlert } from "lucide-react";

import type {
  BookingRoomOption,
  BookingSelection,
  BookingSlotOption,
  BookingTableOption
} from "./types";

type SummaryStatus = "idle" | "invalid" | "unavailable" | "ready";

type BookingSummaryProps = {
  selection: BookingSelection;
  selectedRoom: BookingRoomOption | null;
  selectedTable: BookingTableOption | null;
  selectedSlots: BookingSlotOption[];
  status?: SummaryStatus | undefined;
  validationMessage?: string | undefined;
  unavailableMessage?: string | undefined;
};

function formatDateLabel(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Дата не выбрана";
  }

  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(parsedDate);
}

export function BookingSummary({
  selection,
  selectedRoom,
  selectedTable,
  selectedSlots,
  status = "idle",
  validationMessage,
  unavailableMessage
}: BookingSummaryProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-base font-semibold">Сводка бронирования</h2>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Дата</dt>
          <dd className="font-medium">{formatDateLabel(selection.date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Комната</dt>
          <dd className="font-medium">{selectedRoom?.name ?? "Не выбрана"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Стол</dt>
          <dd className="font-medium">{selectedTable?.label ?? "Не выбран"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Слоты</dt>
          <dd className="font-medium">
            {selectedSlots.length > 0
              ? `${selectedSlots.length.toString()} выбрано`
              : "Не выбраны"}
          </dd>
        </div>
      </dl>

      {selectedSlots.length > 0 ? (
        <ul className="space-y-2 rounded-lg border border-border/70 p-3 text-sm">
          {selectedSlots.map((slot) => (
            <li className="inline-flex items-center gap-2" key={slot.id}>
              <CalendarDays aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{slot.label}</span>
              <span className="text-muted-foreground">
                {slot.startAt} - {slot.endAt}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {status === "invalid" && validationMessage ? (
        <p className="admin-alert admin-alert--warning inline-flex items-start gap-2">
          <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{validationMessage}</span>
        </p>
      ) : null}

      {status === "unavailable" && unavailableMessage ? (
        <p className="inline-flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <CircleDashed aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{unavailableMessage}</span>
        </p>
      ) : null}

      {status === "ready" ? (
        <p className="admin-alert admin-alert--success inline-flex items-start gap-2">
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Выбор заполнен. На следующем шаге можно отправлять заявку.</span>
        </p>
      ) : null}
    </section>
  );
}

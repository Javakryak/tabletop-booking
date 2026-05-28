"use client";

import { Clock3, LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { BookingSlotOption } from "./types";

type SlotPickerProps = {
  slots: BookingSlotOption[];
  selectedSlotIds: string[];
  onToggleSlot: (slotId: string) => void;
  isLoading?: boolean | undefined;
  isUnavailable?: boolean | undefined;
  unavailableMessage?: string | undefined;
  emptyMessage?: string | undefined;
  validationMessage?: string | undefined;
};

function slotIsSelected(slotId: string, selectedSlotIds: string[]): boolean {
  return selectedSlotIds.includes(slotId);
}

export function SlotPicker({
  slots,
  selectedSlotIds,
  onToggleSlot,
  isLoading = false,
  isUnavailable = false,
  unavailableMessage = "Слоты временно недоступны.",
  emptyMessage = "Нет свободных слотов на выбранную дату.",
  validationMessage
}: SlotPickerProps) {
  if (isLoading) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Временные слоты</h2>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
          Загрузка слотов...
        </div>
      </section>
    );
  }

  if (isUnavailable) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Временные слоты</h2>
        <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          {unavailableMessage}
        </p>
      </section>
    );
  }

  if (slots.length === 0) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Временные слоты</h2>
        <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Временные слоты</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {slots.map((slot) => {
          const isSelected = slotIsSelected(slot.id, selectedSlotIds);
          const isDisabled = slot.isUnavailable;

          return (
            <li key={slot.id}>
              <Button
                aria-pressed={isSelected}
                className="h-auto w-full justify-start px-3 py-3 text-left"
                disabled={isDisabled}
                onClick={() => onToggleSlot(slot.id)}
                type="button"
                variant={isSelected ? "default" : "outline"}
              >
                <Clock3 aria-hidden className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{slot.label}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {slot.startAt} - {slot.endAt}
                  </span>
                  {isDisabled && slot.unavailableReason ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-normal text-[#7a4a00]">
                      <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
                      {slot.unavailableReason}
                    </span>
                  ) : null}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>

      {validationMessage ? (
        <p className="admin-alert admin-alert--warning inline-flex items-start gap-2">
          <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{validationMessage}</span>
        </p>
      ) : null}
    </section>
  );
}

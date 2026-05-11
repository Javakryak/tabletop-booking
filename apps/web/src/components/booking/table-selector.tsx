"use client";

import { LoaderCircle, Table2, TriangleAlert, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { BookingTableOption } from "./types";

type TableSelectorProps = {
  tables: BookingTableOption[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  isLoading?: boolean | undefined;
  isUnavailable?: boolean | undefined;
  unavailableMessage?: string | undefined;
  emptyMessage?: string | undefined;
};

export function TableSelector({
  tables,
  selectedTableId,
  onSelectTable,
  isLoading = false,
  isUnavailable = false,
  unavailableMessage = "Список столов временно недоступен.",
  emptyMessage = "Для выбранной комнаты пока нет доступных столов."
}: TableSelectorProps) {
  if (isLoading) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Стол</h2>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
          Загрузка столов...
        </div>
      </section>
    );
  }

  if (isUnavailable) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Стол</h2>
        <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          {unavailableMessage}
        </p>
      </section>
    );
  }

  if (tables.length === 0) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Стол</h2>
        <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Стол</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {tables.map((table) => {
          const isSelected = table.id === selectedTableId;
          const isDisabled = table.isUnavailable;

          return (
            <li key={table.id}>
              <Button
                aria-pressed={isSelected}
                className="h-auto w-full justify-start px-3 py-3 text-left"
                disabled={isDisabled}
                onClick={() => onSelectTable(table.id)}
                type="button"
                variant={isSelected ? "default" : "outline"}
              >
                <Table2 aria-hidden className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{table.label}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                    <UsersRound aria-hidden className="h-3.5 w-3.5" />
                    Вместимость: {table.capacity?.toString() ?? "—"}
                  </span>
                  {table.locationHint ? (
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {table.locationHint}
                    </span>
                  ) : null}
                  {isDisabled && table.unavailableReason ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-normal text-amber-200">
                      <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
                      {table.unavailableReason}
                    </span>
                  ) : null}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

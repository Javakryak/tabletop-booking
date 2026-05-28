"use client";

import { Home, LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { BookingRoomOption } from "./types";

type RoomSelectorProps = {
  rooms: BookingRoomOption[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  isLoading?: boolean | undefined;
  isUnavailable?: boolean | undefined;
  unavailableMessage?: string | undefined;
  emptyMessage?: string | undefined;
};

export function RoomSelector({
  rooms,
  selectedRoomId,
  onSelectRoom,
  isLoading = false,
  isUnavailable = false,
  unavailableMessage = "Список комнат временно недоступен.",
  emptyMessage = "Пока нет комнат для бронирования."
}: RoomSelectorProps) {
  if (isLoading) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Комната</h2>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
          Загрузка комнат...
        </div>
      </section>
    );
  }

  if (isUnavailable) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Комната</h2>
        <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          {unavailableMessage}
        </p>
      </section>
    );
  }

  if (rooms.length === 0) {
    return (
      <section aria-live="polite" className="space-y-3">
        <h2 className="text-base font-semibold">Комната</h2>
        <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Комната</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rooms.map((room) => {
          const isSelected = room.id === selectedRoomId;
          const isDisabled = room.isUnavailable;

          return (
            <li key={room.id}>
              <Button
                aria-pressed={isSelected}
                className="h-auto w-full justify-start px-3 py-3 text-left"
                disabled={isDisabled}
                onClick={() => onSelectRoom(room.id)}
                type="button"
                variant={isSelected ? "default" : "outline"}
              >
                <Home aria-hidden className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{room.name}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {room.description ??
                      `Доступно столов: ${room.tableCount?.toString() ?? "—"}`}
                  </span>
                  {isDisabled && room.unavailableReason ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-normal text-[#7a4a00]">
                      <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
                      {room.unavailableReason}
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

export type BookingRoomOption = {
  id: string;
  name: string;
  tableCount?: number;
  description?: string;
  isUnavailable?: boolean;
  unavailableReason?: string;
};

export type BookingTableOption = {
  id: string;
  label: string;
  capacity?: number;
  locationHint?: string;
  isUnavailable?: boolean;
  unavailableReason?: string;
};

export type BookingSlotOption = {
  id: string;
  label: string;
  startAt: string;
  endAt: string;
  isUnavailable?: boolean;
  unavailableReason?: string;
};

export type BookingSelection = {
  date: string;
  roomId: string | null;
  tableId: string | null;
  slotIds: string[];
};

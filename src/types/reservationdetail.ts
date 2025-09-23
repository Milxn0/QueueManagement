export type ReservationForDetail = {
  id: string;
  queue_code: string | null;
  reservation_datetime: string | null;
  partysize: number | string | null;
  status: string | null;
  user?: { name: string | null } | null;
  cancelled_by?: { name: string | null; role?: string | null } | null;
  cancelled_reason?: string | null;
  cancelled_at?: string | null;
};

export type OccupiedItem = {
  tableNo: number;
  reservationId: string;
  queue_code: string | null;
  reservation_datetime: string;
};

export type Props = {
  open: boolean;
  row: ReservationForDetail | null;
  onClose: () => void;

  // actions
  onConfirm: (id: string) => Promise<void> | void;
  onCancel: (id: string, reason: string) => Promise<void> | void;

  // เลือก/ย้ายโต๊ะ
  currentTableNo: number | null;
  occupied: OccupiedItem[];
  onAssignTable: (
    reservationId: string,
    tableNo: number
  ) => Promise<void> | void;
  onMoveTable: (
    reservationId: string,
    fromNo: number,
    toNo: number
  ) => Promise<void> | void;

  readOnly?: boolean;
  fromManageQueue?: boolean;
};

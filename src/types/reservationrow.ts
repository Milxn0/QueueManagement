export type ReservationRow = {
  id: string;
  user_id: string | null;
  reservation_datetime: string | null;
  partysize: number | string | null;
  queue_code: string | null;
  comment: string | null;
  status: string | null;

  users?: {
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;

  cancelled_at: string | null;
  cancelled_reason: string | null;
  cancelled_by_user_id: string | null;

  cancelled_by?: {
    name: string | null;
    role?: string | null;
  } | null;

  tbl?: { table_name: string | null } | null;
};

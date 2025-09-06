
export type Row = {
  id: string;
  reservation_datetime: string | null;
  queue_code: string | null;
  status: string | null;
  partysize: number | string | null;
  user?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  tbl?: { table_name?: string | null } | null;
};
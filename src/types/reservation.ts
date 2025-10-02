/* eslint-disable @typescript-eslint/no-explicit-any */
export type Step = 1 | 2;

export type Reservation = {
  user: any;
  id: string;
  user_id: string;
  reservation_datetime: string;
  partysize: number | string | null;
  queue_code: string | null;
  comment: string | null;
  status: string | null;
  table_id?: string | null;
  tbl?: { table_name: string | null } | null;
  users?: any;
};

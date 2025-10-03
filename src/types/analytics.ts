export type AnalyticsRange = {
  startISO: string;
  endISO: string;
};

export type AnalyticsTotals = {
  overall: number;
  waiting: number;
  confirmed: number;
  seated: number;
  cancelled: number;
};

export type DailyCount = {
  date: string;
  count: number;
};

export type HeatmapMatrix = number[][];

export type AnalyticsResult = {
  range: AnalyticsRange;
  totals: AnalyticsTotals;
  byDay: DailyCount[];
  heatmap: HeatmapMatrix;
};

export type Row = {
  id: string;
  reservation_datetime: string;
  status: string | null;
  partysize?: number | null;
  queue_code?: string | null;
  user?: {
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};
export type ExportMode = "day" | "month" | "year";
export type Dataset = "reservations" | "users";

export type UsersDailyRow = { date: string; customer: number; staff: number };
export type DailyByName = { day_th: string; visits: number };
export type VisibleKey = "all" | "customer" | "staff";
export interface RoleTotals {
  all: number;
  customer: number;
  staff: number;
  admin: number;
}

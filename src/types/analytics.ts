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
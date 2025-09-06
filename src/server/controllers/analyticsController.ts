/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import "server-only";
import { createServiceClient } from "@/lib/supabaseService";

export type AnalyticsRequest = {
  startISO?: string;
  endISO?: string;
};

export type AnalyticsResult = {
  range: { startISO: string; endISO: string };
  totals: {
    overall: number;
    pending: number;
    confirmed: number;
    seated: number;
    cancelled: number;
  };
  byDay: Array<{ date: string; count: number }>;
  heatmap: number[][];
};

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

function toBangkok(d: Date) {
  return new Date(d.getTime() + TZ_OFFSET_MS);
}
function ymdBangkok(d: Date) {
  const bkk = toBangkok(d);
  const y = bkk.getUTCFullYear();
  const m = String(bkk.getUTCMonth() + 1).padStart(2, "0");
  const day = String(bkk.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function weekdayBangkok(d: Date) {
  return toBangkok(d).getUTCDay();
}
function hourBangkok(d: Date) {
  return toBangkok(d).getUTCHours();
}
function normStatus(
  s: string | null
): "pending" | "confirmed" | "seated" | "cancelled" | "other" {
  const v = (s ?? "").toLowerCase();
  if (v.includes("cancel")) return "cancelled";
  if (v === "pending") return "pending";
  if (v === "seated") return "seated";
  if (v === "confirm" || v === "confirmed") return "confirmed";
  return "other";
}

function defaultMonthRange(): { startISO: string; endISO: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export async function getAnalytics(
  req: AnalyticsRequest
): Promise<AnalyticsResult> {
  const supabase = createServiceClient();

  const { startISO, endISO } = (() => {
    if (req.startISO && req.endISO)
      return { startISO: req.startISO, endISO: req.endISO };
    return defaultMonthRange();
  })();

  const { data, error } = await supabase
    .from("reservations")
    .select("id,reservation_datetime,status")
    .gte("reservation_datetime", startISO)
    .lte("reservation_datetime", endISO)
    .order("reservation_datetime", { ascending: true })
    .limit(10000);

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  let pending = 0,
    confirmed = 0,
    seated = 0,
    cancelled = 0,
    other = 0;
  const byDayMap = new Map<string, number>();
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0)
  );

  for (const r of rows) {
    const iso = (r as any).reservation_datetime as string | null;
    if (!iso) continue;
    const d = new Date(iso);

    const dayStr = ymdBangkok(d);
    byDayMap.set(dayStr, (byDayMap.get(dayStr) ?? 0) + 1);

    const wd = weekdayBangkok(d);
    const hh = hourBangkok(d); 
    heatmap[wd][hh] += 1;

    switch (normStatus((r as any).status ?? null)) {
      case "pending":
        pending++;
        break;
      case "confirmed":
        confirmed++;
        break;
      case "seated":
        seated++;
        break;
      case "cancelled":
        cancelled++;
        break;
      default:
        other++;
        break;
    }
  }

  const byDay = Array.from(byDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    range: { startISO, endISO },
    totals: {
      overall: rows.length,
      pending,
      confirmed,
      seated,
      cancelled,
    },
    byDay,
    heatmap,
  };
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/server/controllers/analyticsController.ts
"use server";
import "server-only";
import { createServiceClient } from "@/lib/supabaseService";

export type AnalyticsRequest = {
  startISO?: string; // ช่วงเริ่ม (ISO)
  endISO?: string; // ช่วงจบ (ISO)
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
  byDay: Array<{ date: string; count: number }>; // YYYY-MM-DD (Asia/Bangkok)
  heatmap: number[][]; // 7 x 24  (0=Sun..6=Sat) ตามเวลา Asia/Bangkok
};

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Bangkok (no DST)

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
  // 0=Sun..6=Sat
  return toBangkok(d).getUTCDay();
}
function hourBangkok(d: Date) {
  return toBangkok(d).getUTCHours(); // 0..23
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
  const m = now.getUTCMonth(); // 0..11
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

  // ดึงเฉพาะฟิลด์ที่ต้องใช้
  const { data, error } = await supabase
    .from("reservations")
    .select("id,reservation_datetime,status")
    .gte("reservation_datetime", startISO)
    .lte("reservation_datetime", endISO)
    .order("reservation_datetime", { ascending: true })
    .limit(10000);

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  // สรุปรวม
  let pending = 0,
    confirmed = 0,
    seated = 0,
    cancelled = 0,
    other = 0;
  // แยกตามวัน (Bangkok)
  const byDayMap = new Map<string, number>();
  // heatmap 7x24
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0)
  );

  for (const r of rows) {
    // datetime
    const iso = (r as any).reservation_datetime as string | null;
    if (!iso) continue;
    const d = new Date(iso);

    const dayStr = ymdBangkok(d);
    byDayMap.set(dayStr, (byDayMap.get(dayStr) ?? 0) + 1);

    const wd = weekdayBangkok(d); // 0..6
    const hh = hourBangkok(d); // 0..23
    heatmap[wd][hh] += 1;

    // สถานะ
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

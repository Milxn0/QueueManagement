import type { LineSeries } from "@/types/chart";
import { ymdLocal } from "@/utils/date";

export function buildReservationSeries<
  T extends { reservation_datetime: string; status?: string | null }
>(rows: T[], daysInMonth: number) {
  const paid = new Array(daysInMonth).fill(0);
  const cancelled = new Array(daysInMonth).fill(0);
  const all = new Array(daysInMonth).fill(0);

  for (const r of rows) {
    const key = ymdLocal(r.reservation_datetime);
    const dt = new Date(key);
    const dayIdx = dt.getDate() - 1;
    if (dayIdx < 0 || dayIdx >= daysInMonth) continue;

    const s = (r.status ?? "").toLowerCase();
    all[dayIdx]++;
    if (s === "paid") paid[dayIdx]++;
    else if (s === "cancelled" || s === "no_show") cancelled[dayIdx]++;
  }

  const m = Math.max(5, ...paid, ...cancelled, ...all);
  const series: LineSeries[] = [
    { name: "ทั้งหมด", color: "#0ea5e9", values: all },
    { name: "จ่ายแล้ว", color: "#22c55e", values: paid },
    { name: "ยกเลิก", color: "#ef4444", values: cancelled },
  ];

  return {
    series,
    maxY: m,
    totals: {
      all: all.reduce((a, b) => a + b, 0),
      paid: paid.reduce((a, b) => a + b, 0),
      cancelled: cancelled.reduce((a, b) => a + b, 0),
    },
  };
}

export function buildUsersSeries(params: {
  daysInMonth: number;
  startISO: string;
  debouncedName: string;
  byName: Array<{ day_th: string; visits: number }>;
  userDaily: Array<{ date: string; customer: number; staff: number }>;
  visible: Array<"all" | "customer" | "staff">;
}) {
  const { daysInMonth, startISO, debouncedName, byName, userDaily, visible } =
    params;
  const monthStart = new Date(startISO);

  const allVals = new Array(daysInMonth).fill(0);
  const custVals = new Array(daysInMonth).fill(0);
  const staffVals = new Array(daysInMonth).fill(0);

  if (debouncedName.trim()) {
    for (const r of byName) {
      const d = new Date(String(r.day_th) + "T00:00:00");
      const idx = Math.floor((+d - +monthStart) / (24 * 3600 * 1000));
      if (idx >= 0 && idx < daysInMonth) allVals[idx] = Number(r.visits ?? 0);
    }
    const m = Math.max(5, ...allVals);
    return {
      series: [
        {
          name: `ทั้งหมด — ${debouncedName.trim()}`,
          color: "#1D4ED8",
          values: allVals,
        },
      ] as LineSeries[],
      maxY: m,
      totals: {
        all: allVals.reduce((a, b) => a + b, 0),
        paid: 0,
        cancelled: 0,
      },
    };
  }

  for (const r of userDaily) {
    const d = new Date(String(r.date) + "T00:00:00");
    const idx = Math.floor((+d - +monthStart) / (24 * 3600 * 1000));
    if (idx < 0 || idx >= daysInMonth) continue;
    const c = Number(r.customer ?? 0);
    const s = Number(r.staff ?? 0);
    custVals[idx] = c;
    staffVals[idx] = s;
    allVals[idx] = c + s;
  }

  const allSeries: LineSeries = {
    name: "ทั้งหมด",
    color: "#1D4ED8",
    values: allVals,
  };
  const custSeries: LineSeries = {
    name: "ลูกค้า (customer)",
    color: "#16A34A",
    values: custVals,
  };
  const staffSeries: LineSeries = {
    name: "พนักงาน (staff)",
    color: "#DC2626",
    values: staffVals,
  };

  const list = [
    visible.includes("all") ? allSeries : null,
    visible.includes("customer") ? custSeries : null,
    visible.includes("staff") ? staffSeries : null,
  ].filter(Boolean) as LineSeries[];

  const m = Math.max(5, ...list.flatMap((s) => s.values));
  return {
    series: list,
    maxY: m,
    totals: {
      all: allVals.reduce((a, b) => a + b, 0),
      paid: custVals.reduce((a, b) => a + b, 0),
      cancelled: staffVals.reduce((a, b) => a + b, 0),
    },
  };
}

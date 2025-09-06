/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import LinesChart from "@/components/admin/LinesChart";
import {
  monthRangeFromYYYYMM,
  makeRangeISO,
  formatBangkok,
  ymdLocal,
} from "@/utils/date";
import SummaryCard from "@/components/admin/SummaryCard";
import type { AnalyticsResult } from "@/types/analytics";
import type { Series, LineSeries } from "@/types/chart";
import type { Row } from "@/types/analytics";

type ExportMode = "day" | "month" | "year";

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ----- เดือนของกราฟ -----
  const initialMonth = new Date().toISOString().slice(0, 7); // yyyy-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const { startISO, endISO, daysInMonth } = useMemo(
    () => monthRangeFromYYYYMM(selectedMonth),
    [selectedMonth]
  );

  // ----- ข้อมูลรายวันสำหรับกราฟเส้น -----
  const [rows, setRows] = useState<Row[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ start: startISO, end: endISO });
      const res = await fetch("/api/admin/analytics?" + qs.toString(), {
        cache: "no-store",
      });
      const json: AnalyticsResult = await res.json();
      setAnalytics(json);
    } catch (e: any) {
      setErr(e?.message ?? "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [startISO, endISO]);

  const fetchRows = useCallback(async () => {
    // ดึงข้อมูลคิวของเดือนนั้น ๆ เพื่อ aggregate เป็นกราฟเส้นแบบ All/Confirmed/Pending/Cancelled
    const { data, error } = await supabase
      .from("reservations")
      .select("id,reservation_datetime,status")
      .gte("reservation_datetime", startISO)
      .lte("reservation_datetime", endISO)
      .order("reservation_datetime", { ascending: true })
      .limit(5000);

    if (!error) setRows((data ?? []) as Row[]);
  }, [supabase, startISO, endISO]);

  useEffect(() => {
    fetchAnalytics();
    fetchRows();
  }, [fetchAnalytics, fetchRows]);

  // ---------- Export controls ----------
  const today = new Date();
  const defaultDay = today.toISOString().slice(0, 10); 
  const defaultMonth = defaultDay.slice(0, 7);
  const defaultYear = String(today.getFullYear());

  const [mode, setMode] = useState<ExportMode>("day");
  const [dayVal, setDayVal] = useState<string>(defaultDay);
  const [monthVal, setMonthVal] = useState<string>(defaultMonth);
  const [yearVal, setYearVal] = useState<string>(defaultYear);
  const [exporting, setExporting] = useState(false);

  const csvEscape = (val: unknown) => {
    const s = val == null ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportCSV = useCallback(
    async (m: ExportMode, d: string, mo: string, y: string) => {
      const { start, end, label } = makeRangeISO(m, d, mo, y);
      setExporting(true);
      try {
        const { data, error } = await supabase
          .from("reservations")
          .select(
            `
            id, reservation_datetime, status, partysize, queue_code,
            user:users!reservations_user_id_fkey(name, phone, email)
          `
          )
          .gte("reservation_datetime", start)
          .lte("reservation_datetime", end)
          .order("reservation_datetime", { ascending: true });

        if (error) {
          alert(`ไม่สามารถส่งออกได้: ${error.message}`);
          return;
        }

        const list = (data ?? []) as any[];
        if (!list.length) {
          alert("ไม่มีรายการในช่วงเวลาที่เลือก");
          return;
        }

        const headers = [
          "Queue Code",
          "Date / Time",
          "Status",
          "Partysize",
          "Name",
          "Phone",
          "Email",
          "Reservation ID",
        ];

        const lines = list.map((r) =>
          [
            r.queue_code ?? "",
            formatBangkok(r.reservation_datetime),
            r.status ?? "",
            r.partysize ?? "",
            r.user?.name ?? "",
            r.user?.phone ? `'${r.user.phone}` : "",
            r.user?.email ?? "",
            r.id,
          ]
            .map(csvEscape)
            .join(",")
        );

        const csv = ["sep=,", headers.join(","), ...lines].join("\r\n");
        const blob = new Blob([`\uFEFF${csv}`], {
          type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reservations_${m}_${label}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } finally {
        setExporting(false);
      }
    },
    [supabase]
  );

  // ----- สร้างซีรีส์สำหรับกราฟเส้นจาก rows -----
  const { series, maxY, totals } = useMemo(() => {
    const pending = new Array(daysInMonth).fill(0);
    const confirmed = new Array(daysInMonth).fill(0);
    const cancelled = new Array(daysInMonth).fill(0);
    const all = new Array(daysInMonth).fill(0);

    for (const r of rows) {
      const key = ymdLocal(r.reservation_datetime);
      const dt = new Date(key);
      const dayIdx = dt.getDate() - 1;
      if (dayIdx < 0 || dayIdx >= daysInMonth) continue;

      const s = (r.status ?? "").toLowerCase();
      all[dayIdx]++;

      if (s === "pending") pending[dayIdx]++;
      else if (s === "cancelled" || s === "no_show") cancelled[dayIdx]++;
      else if (s === "confirmed" || s === "seated" || s === "completed")
        confirmed[dayIdx]++;
      else confirmed[dayIdx]++;
    }

    const m = Math.max(5, ...pending, ...confirmed, ...cancelled, ...all);

    return {
      series: [
        { name: "ทั้งหมด", color: "#0ea5e9", values: all },
        { name: "ยืนยันแล้ว", color: "#22c55e", values: confirmed },
        { name: "รอคอนเฟิร์ม", color: "#f59e0b", values: pending },
        { name: "ยกเลิก/ไม่มา", color: "#ef4444", values: cancelled },
      ] as LineSeries[],
      maxY: m,
      totals: {
        all: all.reduce((a, b) => a + b, 0),
        confirmed: confirmed.reduce((a, b) => a + b, 0),
        pending: pending.reduce((a, b) => a + b, 0),
        cancelled: cancelled.reduce((a, b) => a + b, 0),
      },
    };
  }, [rows, daysInMonth]);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            Analytics
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            สถิติการจอง
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            สถิติการจอง ของคิวทั้งหมด
          </p>
        </div>
      </div>

      {/* Export controls */}
      <section className="mb-6 rounded-2xl border bg-white shadow-sm">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">
            ส่งออกเป็น Excel (CSV)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            เลือกระยะเวลา แล้วกด “ส่งออก”
          </p>
        </div>
        <div className="p-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">รูปแบบ</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ExportMode)}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              <option value="day">รายวัน</option>
              <option value="month">รายเดือน</option>
              <option value="year">รายปี</option>
            </select>
          </div>

          {mode === "day" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">วันที่</label>
              <input
                type="date"
                value={dayVal}
                onChange={(e) => setDayVal(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          )}

          {mode === "month" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">เดือน</label>
              <input
                type="month"
                value={monthVal}
                onChange={(e) => setMonthVal(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          )}

          {mode === "year" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">ปี</label>
              <input
                type="number"
                min={2000}
                max={9999}
                value={yearVal}
                onChange={(e) => setYearVal(e.target.value)}
                className="w-24 rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="md:ml-auto">
            <button
              onClick={() => exportCSV(mode, dayVal, monthVal, yearVal)}
              disabled={exporting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {exporting ? "กำลังส่งออก…" : "ส่งออก"}
            </button>
          </div>
        </div>
      </section>

      {/* quick summary */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="คิวทั้งหมด"
          value={totals.all}
          className="bg-sky-50 text-sky-700"
        />
        <SummaryCard
          label="ยืนยันแล้ว"
          value={totals.confirmed}
          className="bg-emerald-50 text-emerald-700"
        />
        <SummaryCard
          label="รอคอนเฟิร์ม"
          value={totals.pending}
          className="bg-amber-50 text-amber-700"
        />
        <SummaryCard
          label="ยกเลิก/ไม่มา"
          value={totals.cancelled}
          className="bg-rose-50 text-rose-700"
        />
      </section>

      {/* charts */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            กราฟเดือนนี้
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">เดือน</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          ) : err ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              {err}
            </div>
          ) : (
            <>
              <LinesChart
                days={daysInMonth}
                series={series}
                maxY={niceMax(maxY)}
              />
              {analytics && <div className="mt-6"></div>}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

/* ---------- Components ---------- */

function niceMax(maxY: number) {
  if (maxY <= 10) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(maxY)));
  const unit = pow / 2;
  return Math.ceil(maxY / unit) * unit;
}

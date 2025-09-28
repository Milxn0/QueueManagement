/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { LineSeries } from "@/types/chart";
import type { Row } from "@/types/analytics";
import { faChartSimple } from "@fortawesome/free-solid-svg-icons/faChartSimple";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type ExportMode = "day" | "month" | "year";
type Dataset = "reservations" | "users";

type UsersDailyRow = { date: string; customer: number; staff: number };
type DailyByName = { day_th: string; visits: number };
type VisibleKey = "all" | "customer" | "staff";

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);

  const initialMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const { startISO, endISO, daysInMonth } = useMemo(
    () => monthRangeFromYYYYMM(selectedMonth),
    [selectedMonth]
  );

  const [dataset, setDataset] = useState<Dataset>("reservations");
  const [name, setName] = useState("");
  const [visible, setVisible] = useState<VisibleKey[]>([
    "all",
    "customer",
    "staff",
  ]);

  const [debouncedName, setDebouncedName] = useState(name);
  const debTimer = useRef<number | null>(null);
  useEffect(() => {
    if (debTimer.current) window.clearTimeout(debTimer.current);
    debTimer.current = window.setTimeout(() => setDebouncedName(name), 350);
    return () => {
      if (debTimer.current) window.clearTimeout(debTimer.current);
    };
  }, [name]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setErr(null);
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
    const { data, error } = await supabase
      .from("reservations")
      .select("id,reservation_datetime,status")
      .gte("reservation_datetime", startISO)
      .lte("reservation_datetime", endISO)
      .order("reservation_datetime", { ascending: true })
      .limit(5000);
    if (!error) setRows((data ?? []) as Row[]);
  }, [supabase, startISO, endISO]);

  const [userDaily, setUserDaily] = useState<UsersDailyRow[]>([]);
  const [byName, setByName] = useState<DailyByName[]>([]);

  const fetchUsersOverall = useCallback(async () => {
    const qs = new URLSearchParams({ start: startISO, end: endISO });
    const res = await fetch(
      "/api/admin/analytics/users-daily?" + qs.toString(),
      {
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error("users-daily failed");
    const json = (await res.json()) as UsersDailyRow[];
    setUserDaily(Array.isArray(json) ? json : []);
    setByName([]);
  }, [startISO, endISO]);

  const fetchUsersByName = useCallback(
    async (q: string) => {
      const url = new URL(
        "/api/admin/analytics/user-daily-by-name",
        window.location.origin
      );
      url.searchParams.set("name", q.trim());
      url.searchParams.set("roles", ["customer", "staff"].join(","));
      url.searchParams.set("start", startISO);
      url.searchParams.set("end", endISO);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("user-daily-by-name failed");
      const json = (await res.json()) as DailyByName[];
      setByName(Array.isArray(json) ? json : []);
      setUserDaily([]);
    },
    [startISO, endISO]
  );

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);
      try {
        if (dataset === "reservations") {
          await Promise.all([fetchAnalytics(), fetchRows()]);
        } else {
          if (!debouncedName.trim()) await fetchUsersOverall();
          else await fetchUsersByName(debouncedName);
        }
      } catch (e: any) {
        setErr(e?.message ?? "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [
    dataset,
    debouncedName,
    fetchAnalytics,
    fetchRows,
    fetchUsersOverall,
    fetchUsersByName,
  ]);

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

  const { series, maxY, totals } = useMemo(() => {
    if (dataset === "reservations") {
      // การจอง
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
      return {
        series: [
          { name: "ทั้งหมด", color: "#0ea5e9", values: all },
          { name: "จ่ายแล้ว", color: "#22c55e", values: paid },
          { name: "ยกเลิก", color: "#ef4444", values: cancelled },
        ] as LineSeries[],
        maxY: m,
        totals: {
          all: all.reduce((a, b) => a + b, 0),
          paid: paid.reduce((a, b) => a + b, 0),
          cancelled: cancelled.reduce((a, b) => a + b, 0),
        },
      };
    } else {
      // การใช้งานผู้ใช้ (รวม หรือ คนเดียว)
      const monthStart = new Date(startISO);

      const allVals = new Array(daysInMonth).fill(0);
      const custVals = new Array(daysInMonth).fill(0);
      const staffVals = new Array(daysInMonth).fill(0);

      if (debouncedName.trim()) {
        for (const r of byName) {
          const d = new Date(String(r.day_th) + "T00:00:00");
          const idx = Math.floor((+d - +monthStart) / (24 * 3600 * 1000));
          if (idx >= 0 && idx < daysInMonth)
            allVals[idx] = Number(r.visits ?? 0);
        }
        const m = Math.max(5, ...allVals);
        return {
          series: [
            {
              name: `ทั้งหมด — ${debouncedName.trim()}`,
              color: "#1D4ED8",
              values: allVals,
            },
          ],
          maxY: m,
          totals: {
            all: allVals.reduce((a, b) => a + b, 0),
            paid: 0,
            cancelled: 0,
          },
        };
      } else {
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

        const allSeries = {
          name: "ทั้งหมด",
          color: "#1D4ED8",
          values: allVals,
        };
        const custSeries = {
          name: "ลูกค้า (customer)",
          color: "#16A34A",
          values: custVals,
        };
        const staffSeries = {
          name: "พนักงาน (staff)",
          color: "#DC2626",
          values: staffVals,
        };

        const list: LineSeries[] = [
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
    }
  }, [
    dataset,
    rows,
    userDaily,
    byName,
    debouncedName,
    daysInMonth,
    startISO,
    visible,
  ]);

  const [roleTotals, setRoleTotals] = useState<{
    all: number;
    customer: number;
    staff: number;
    admin: number;
  }>({ all: 0, customer: 0, staff: 0, admin: 0 });
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/analytics/users-summary", {
        cache: "no-store",
      });
      const data = await res.json();
      setRoleTotals(data);
    })();
  }, []);

  const toggle = (k: VisibleKey) =>
    setVisible((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  const clearName = () => setName("");

  const hasNoData =
    !loading && series.every((s) => s.values.every((v) => v === 0));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60">
        <div className="flex items-start justify-between p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
              <FontAwesomeIcon icon={faChartSimple} />
              Analytics
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
              สถิติของระบบ
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              เลือก “มุมมองข้อมูล”, เดือน, และพิมพ์ชื่อ
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <label className="text-xs text-gray-500">เดือน</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm bg-white"
              aria-label="เลือกเดือน"
            />
          </div>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-gray-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* dataset segmented */}
            <div
              className="inline-flex overflow-hidden rounded-full border border-gray-300"
              role="tablist"
            >
              {(["reservations", "users"] as const).map((key) => {
                const active = dataset === key;
                const label =
                  key === "reservations" ? "การจอง" : "การใช้งานผู้ใช้";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDataset(key)}
                    role="tab"
                    aria-selected={active}
                    className={[
                      "px-4 py-1.5 text-sm",
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {dataset === "users" && (
              <div className="relative">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="พิมพ์ชื่อ/อีเมล/เบอร์ (เว้นว่าง = แสดงรวม)"
                  className="input input-bordered rounded-2xl px-4 py-2 w-72 pr-10"
                />
                {name && (
                  <button
                    onClick={clearName}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="ล้างคำค้น"
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {dataset === "users" && !debouncedName.trim() && (
              <div className="inline-flex overflow-hidden rounded-full border border-gray-300">
                {(["all", "customer", "staff"] as const).map((k) => {
                  const active = visible.includes(k);
                  const label =
                    k === "all"
                      ? "ทั้งหมด"
                      : k === "customer"
                      ? "ลูกค้า"
                      : "พนักงาน";
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggle(k)}
                      className={[
                        "px-3 py-1 text-sm",
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* quick month (mobile) */}
          <div className="flex items-center gap-2 md:hidden">
            <label className="text-sm text-gray-600">เดือน</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          {dataset === "reservations" && (
            <div className="flex items-end gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ExportMode)}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="day">รายวัน</option>
                <option value="month">รายเดือน</option>
                <option value="year">รายปี</option>
              </select>

              {mode === "day" && (
                <input
                  type="date"
                  value={dayVal}
                  onChange={(e) => setDayVal(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              )}
              {mode === "month" && (
                <input
                  type="month"
                  value={monthVal}
                  onChange={(e) => setMonthVal(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              )}
              {mode === "year" && (
                <input
                  type="number"
                  min={2000}
                  max={9999}
                  value={yearVal}
                  onChange={(e) => setYearVal(e.target.value)}
                  className="w-24 rounded-xl border px-3 py-2 text-sm"
                />
              )}

              <button
                onClick={() => exportCSV(mode, dayVal, monthVal, yearVal)}
                disabled={exporting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {exporting ? "กำลังส่งออก…" : "ส่งออก CSV"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Summary cards */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {dataset === "reservations" ? (
          <>
            <SummaryCard
              label="Total Queue"
              value={totals.all}
              className="bg-sky-50 text-sky-700"
            />
            <SummaryCard
              label="Completed"
              value={totals.paid}
              className="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              label="cancelled"
              value={totals.cancelled}
              className="bg-rose-50 text-rose-700"
            />
          </>
        ) : (
          <>
            <SummaryCard
              label="Total Account"
              value={roleTotals.all}
              className="bg-sky-50 text-sky-700"
            />
            <SummaryCard
              label="Total Staff"
              value={roleTotals.staff}
              className="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              label="Total Customers"
              value={roleTotals.customer}
              className="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              label="Total Today Login"
              value={totals.all}
              className="bg-sky-50 text-sky-700"
            />
            <SummaryCard
              label="Total Staff Login"
              value={totals.cancelled}
              className="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              label="Total Customer Login"
              value={totals.paid}
              className="bg-emerald-50 text-emerald-700"
            />
          </>
        )}
      </section>

      {/* Chart */}
      <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">
            {dataset === "reservations"
              ? "กราฟการจอง (ต่อวัน)"
              : "กราฟการใช้งานของผู้ใช้ (ต่อวัน)"}
          </h2>
          <span className="text-xs text-gray-500">
            ช่วงเวลา: {formatBangkok(startISO)} – {formatBangkok(endISO)}
          </span>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          ) : err ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              {err}
            </div>
          ) : hasNoData ? (
            <div className="flex h-64 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500">
              ยังไม่มีข้อมูลในช่วงเวลานี้
            </div>
          ) : (
            <LinesChart
              days={daysInMonth}
              series={series}
              maxY={niceMax(maxY)}
            />
          )}
        </div>
      </section>
    </main>
  );
}

/* ---------- Utils ---------- */
function niceMax(maxY: number) {
  if (maxY <= 10) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(maxY)));
  const unit = pow / 2;
  return Math.ceil(maxY / unit) * unit;
}

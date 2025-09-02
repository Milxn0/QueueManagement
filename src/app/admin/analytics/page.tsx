/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Row = {
  id: string;
  reservation_datetime: string;
  status: string | null;
  // fields used for export (optional in chart)
  partysize?: number | null;
  queue_code?: string | null;
  user?: {
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

type Series = {
  name: string;
  color: string; // HEX
  values: number[];
};

type ExportMode = "day" | "month" | "year";

const TZ = "Asia/Bangkok";

function ymdLocal(dateISO: string) {
  const d = new Date(dateISO);
  const y = d.toLocaleString("en-CA", { timeZone: TZ, year: "numeric" });
  const m = d.toLocaleString("en-CA", { timeZone: TZ, month: "2-digit" });
  const day = d.toLocaleString("en-CA", { timeZone: TZ, day: "2-digit" });
  return `${y}-${m}-${day}`;
}

function endOfMonthISO(d = new Date()) {
  return new Date(
    d.getFullYear(),
    d.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  ).toISOString();
}
function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).toISOString();
}

// ----- helper: range from YYYY-MM -----
function monthRangeFromYYYYMM(ym: string) {
  const [Y, M] = ym.split("-").map(Number);
  const start = new Date(Y, (M ?? 1) - 1, 1, 0, 0, 0, 0);
  const end = new Date(Y, M ?? 1, 0, 23, 59, 59, 999);
  const days = new Date(Y, M ?? 1, 0).getDate();
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    daysInMonth: days,
  };
}

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ----- chart month selector -----
  const initialMonth = new Date().toISOString().slice(0, 7); // yyyy-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const { startISO, endISO, daysInMonth } = useMemo(
    () => monthRangeFromYYYYMM(selectedMonth),
    [selectedMonth]
  );

  const [rows, setRows] = useState<Row[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("reservations")
      .select("id,reservation_datetime,status")
      .gte("reservation_datetime", startISO)
      .lte("reservation_datetime", endISO)
      .order("reservation_datetime", { ascending: true });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, [supabase, startISO, endISO]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Export controls ----------
  const today = new Date();
  const defaultDay = today.toISOString().slice(0, 10); // yyyy-MM-dd
  const defaultMonth = defaultDay.slice(0, 7); // yyyy-MM
  const defaultYear = String(today.getFullYear());

  const [mode, setMode] = useState<ExportMode>("day");
  const [dayVal, setDayVal] = useState<string>(defaultDay);
  const [monthVal, setMonthVal] = useState<string>(defaultMonth);
  const [yearVal, setYearVal] = useState<string>(defaultYear);
  const [exporting, setExporting] = useState(false);

  function makeRangeISO(m: ExportMode, d: string, mth: string, y: string) {
    if (m === "day") {
      const [Y, M, D] = d.split("-").map(Number);
      const start = new Date(Y, (M ?? 1) - 1, D ?? 1, 0, 0, 0, 0);
      const end = new Date(Y, (M ?? 1) - 1, D ?? 1, 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString(), label: d };
    }
    if (m === "month") {
      const [Y, M] = mth.split("-").map(Number);
      const start = new Date(
        Y ?? today.getFullYear(),
        (M ?? 1) - 1,
        1,
        0,
        0,
        0,
        0
      );
      const end = new Date(
        Y ?? today.getFullYear(),
        M ?? 1,
        0,
        23,
        59,
        59,
        999
      );
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${mth}`,
      };
    }
    // year
    const Y = Number(y);
    const start = new Date(Y, 0, 1, 0, 0, 0, 0);
    const end = new Date(Y, 11, 31, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: y };
  }

  const formatBangkok = (iso: string) =>
    new Date(iso).toLocaleString("th-TH", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

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

  // aggregate to daily series
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
      ] as Series[],
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
            แสดงจำนวนคิวรายวัน แยกตามสถานะ — ช่วงเวลา: เดือนปัจจุบัน
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
            เลือกช่วงเวลา แล้วกด “ส่งออก”
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

      {/* chart */}
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

/* ---------- Components ---------- */

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl p-6 shadow-sm ${className ?? ""}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium">{label}</div>
    </div>
  );
}

function niceMax(maxY: number) {
  if (maxY <= 10) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(maxY)));
  const unit = pow / 2;
  return Math.ceil(maxY / unit) * unit;
}

function LinesChart({
  days,
  series,
  maxY,
}: {
  days: number;
  series: Series[];
  maxY: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 920;
  const H = 300;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const x = (i: number) => pad.l + (iw * i) / (days - 1 || 1);
  const y = (v: number) => pad.t + ih - (ih * v) / (maxY || 1);

  const ticksX = useMemo(() => {
    const arr = [
      1,
      Math.ceil(days / 4),
      Math.ceil(days / 2),
      Math.ceil((3 * days) / 4),
      days,
    ];
    return Array.from(new Set(arr)).filter((n) => n >= 1 && n <= days);
  }, [days]);

  const ticksY = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxY / 5));
    const out: number[] = [];
    for (let v = 0; v <= maxY; v += step) out.push(v);
    if (out[out.length - 1] !== maxY) out.push(maxY);
    return out;
  }, [maxY]);

  const toPath = (vals: number[]) => {
    return vals
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
      .join(" ");
  };

  const handleMove = (e: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const px = e.clientX - rect.left - pad.l;
    const i = Math.round((px / (iw || 1)) * (days - 1));
    if (i >= 0 && i < days) setHover(i);
  };

  const handleLeave = () => setHover(null);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px]">
        {/* axes */}
        {/* X grid */}
        {ticksX.map((d) => (
          <line
            key={`gx-${d}`}
            x1={x(d - 1)}
            x2={x(d - 1)}
            y1={pad.t}
            y2={pad.t + ih}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
          />
        ))}
        {/* Y grid + labels */}
        {ticksY.map((v) => (
          <g key={`gy-${v}`}>
            <line
              x1={pad.l}
              x2={pad.l + iw}
              y1={y(v)}
              y2={y(v)}
              stroke="#e5e7eb"
            />
            <text
              x={pad.l - 8}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {v}
            </text>
          </g>
        ))}
        {/* X labels */}
        {ticksX.map((d) => (
          <text
            key={`xl-${d}`}
            x={x(d - 1)}
            y={pad.t + ih + 18}
            textAnchor="middle"
            fontSize="11"
            fill="#6b7280"
          >
            {d}
          </text>
        ))}

        {/* lines */}
        {series.map((s) => (
          <path
            key={s.name}
            d={toPath(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
          />
        ))}

        {/* markers on hover */}
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.t}
              y2={pad.t + ih}
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
            {series.map((s, i) => (
              <circle
                key={`dot-${i}`}
                cx={x(hover)}
                cy={y(s.values[hover] ?? 0)}
                r={3.5}
                fill="#fff"
                stroke={s.color}
                strokeWidth={2}
              />
            ))}
          </>
        )}

        {/* capture area */}
        <rect
          x={pad.l}
          y={pad.t}
          width={iw}
          height={ih}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        />
      </svg>

      {/* legend + tooltip */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-gray-700">{s.name}</span>
          </div>
        ))}

        {hover !== null && (
          <div className="ml-auto rounded-xl border bg-white px-3 py-2 text-xs shadow-sm">
            <div className="font-semibold text-gray-800">
              วันที่ {hover + 1}
            </div>
            {series.map((s) => (
              <div key={`tt-${s.name}`} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-gray-700">{s.name}</span>
                <span className="ml-2 font-medium text-gray-900">
                  {s.values[hover] ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

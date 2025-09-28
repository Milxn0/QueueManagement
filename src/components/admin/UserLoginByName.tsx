"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import LinesChart from "@/components/admin/LinesChart";
import { ymdLocal, formatBangkok } from "@/utils/date";

type DailyByName = { day_th: string; visits: number };
type DailyOverall = { date: string; customer: number; staff: number };

type VisibleKey = "all" | "customer" | "staff";

export default function UserLoginByName() {
  const [name, setName] = useState("");
  const [visible, setVisible] = useState<VisibleKey[]>(["all", "customer", "staff"]); 

  const [yearMonth, setYearMonth] = useState(
    ymdLocal(new Date().toISOString()).slice(0, 7)
  );

  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  });

  const [loading, setLoading] = useState(false);
  const [overall, setOverall] = useState<DailyOverall[]>([]);
  const [byName, setByName] = useState<DailyByName[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [debouncedName, setDebouncedName] = useState(name);
  const debTimer = useRef<number | null>(null);
  useEffect(() => {
    if (debTimer.current) window.clearTimeout(debTimer.current);
    debTimer.current = window.setTimeout(() => setDebouncedName(name), 350);
    return () => {
      if (debTimer.current) window.clearTimeout(debTimer.current);
    };
  }, [name]);

  useEffect(() => {
    const [y, m] = yearMonth.split("-").map(Number);
    const start = new Date(y, (m || 1) - 1, 1);
    const end = new Date(y, m || 1, 1);
    setRange({ startISO: start.toISOString(), endISO: end.toISOString() });
  }, [yearMonth]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!debouncedName.trim()) {
      const url = new URL("/api/admin/analytics/users-daily", window.location.origin);
      url.searchParams.set("start", range.startISO);
      url.searchParams.set("end", range.endISO);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = (await res.json()) as DailyOverall[] | { error?: string };
      if (Array.isArray(data)) {
        setOverall(data);
        setByName([]);
      } else {
        setError(data.error ?? "ไม่สามารถโหลดข้อมูลรวมได้");
        setOverall([]);
      }
    } else {
      const url = new URL("/api/admin/analytics/user-daily-by-name", window.location.origin);
      url.searchParams.set("name", debouncedName.trim());
      url.searchParams.set("roles", ["customer","staff"].join(","));
      url.searchParams.set("start", range.startISO);
      url.searchParams.set("end", range.endISO);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = (await res.json()) as DailyByName[] | { error?: string };
      if (Array.isArray(data)) {
        setByName(data);
        setOverall([]);
      } else {
        setError(data.error ?? "ไม่สามารถโหลดข้อมูลเฉพาะชื่อได้");
        setByName([]);
      }
    }

    setLoading(false);
  }, [debouncedName, range.startISO, range.endISO]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { days, chartSeries, maxY, total } = useMemo(() => {
    const [y, m] = yearMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthStart = new Date(y, (m ?? 1) - 1, 1);

    // arrays
    const allVals = new Array<number>(daysInMonth).fill(0);
    const custVals = new Array<number>(daysInMonth).fill(0);
    const staffVals = new Array<number>(daysInMonth).fill(0);

    if (debouncedName.trim()) {
      for (const r of byName) {
        const d = new Date(String(r.day_th) + "T00:00:00");
        const idx = Math.floor((+d - +monthStart) / (24 * 60 * 60 * 1000));
        if (idx >= 0 && idx < daysInMonth) allVals[idx] = Number(r.visits ?? 0);
      }
    } else {
      for (const r of overall) {
        const d = new Date(String(r.date) + "T00:00:00");
        const idx = Math.floor((+d - +monthStart) / (24 * 60 * 60 * 1000));
        if (idx < 0 || idx >= daysInMonth) continue;
        const c = Number(r.customer ?? 0);
        const s = Number(r.staff ?? 0);
        custVals[idx] = c;
        staffVals[idx] = s;
        allVals[idx] = c + s;
      }
    }

    // label
    const labelBase = `(${formatBangkok(range.startISO)} → ${formatBangkok(range.endISO)})`;
    const titleName = debouncedName.trim() ? ` — ${debouncedName.trim()}` : "";

    const allSeries   = { name: `ทั้งหมด ${labelBase}${titleName}`, color: "#1D4ED8", values: allVals }; 
    const custSeries  = { name: `customer ${labelBase}`,             color: "#16A34A", values: custVals };
    const staffSeries = { name: `staff ${labelBase}`,                color: "#DC2626", values: staffVals };

    let seriesList = [];
    if (debouncedName.trim()) {
      seriesList = [allSeries];
    } else {
      seriesList = [
        visible.includes("all") ? allSeries : null,
        visible.includes("customer") ? custSeries : null,
        visible.includes("staff") ? staffSeries : null,
      ].filter(Boolean) as typeof allSeries[];
    }

    const mY = Math.max(5, ...seriesList.flatMap(s => s.values));
    const total = allVals.reduce((sum, v) => sum + (v || 0), 0);
    return { days: daysInMonth, chartSeries: seriesList, maxY: mY, total };
  }, [byName, overall, debouncedName, visible, range, yearMonth]);

  // UI helpers
  const toggle = (k: VisibleKey) =>
    setVisible((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const clearName = () => setName("");

  const nothing =
    !loading &&
    total === 0 &&
    ((debouncedName.trim() && byName.length === 0) ||
      (!debouncedName.trim() && overall.length === 0));

  return (
    <section className="mt-10">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">สถิติการเข้าใช้งานของผู้ใช้</h2>
          <p className="text-xs text-gray-500">
            ไม่กรอกชื่อ = แสดงรวมทั้งระบบ / กรอกชื่อ = ดูเฉพาะคนนั้น
          </p>
        </div>
        <div className="hidden md:block text-sm text-gray-500">
          รวมทั้งหมด: <span className="font-semibold text-indigo-700">{total}</span> ครั้ง
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="พิมพ์ชื่อ/อีเมล/เบอร์ (เว้นว่าง = แสดงรวม)"
            className="input input-bordered rounded-2xl px-4 py-2 w-72 pr-10"
            aria-label="ค้นหาผู้ใช้"
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

        <div className="flex items-center gap-2">
          <select
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="select select-bordered rounded-2xl px-4 py-2"
            aria-label="เลือกเดือน"
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const ym = ymdLocal(d.toISOString()).slice(0, 7);
              return (
                <option key={ym} value={ym}>
                  {ym}
                </option>
              );
            })}
          </select>
        </div>

        <div className="inline-flex overflow-hidden rounded-full border border-gray-300">
          {(["all","customer","staff"] as const).map((k) => {
            const active = visible.includes(k);
            const label = k === "all" ? "ทั้งหมด" : k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                className={[
                  "px-3 py-1 text-sm capitalize transition-colors",
                  active ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                aria-pressed={active}
                aria-label={`toggle ${k}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Fetch */}
        <button
          onClick={fetchData}
          className="btn rounded-2xl px-4 py-2"
          disabled={loading}
          type="button"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              กำลังโหลด...
            </span>
          ) : (
            "ค้นหา"
          )}
        </button>
      </div>

      {/* Card */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        {loading && (
          <div className="mb-3 h-1 w-full overflow-hidden rounded bg-indigo-100">
            <div className="h-full w-1/3 animate-[loading_1.2s_ease_infinite] bg-indigo-500" />
          </div>
        )}

        {nothing ? (
          <div className="flex min-h-[180px] items-center justify-center text-sm text-gray-500">
            {debouncedName.trim()
              ? "ไม่พบการเข้าใช้งานของผู้ใช้ตามคำค้นหาในช่วงเวลาที่เลือก"
              : "ยังไม่มีการเข้าใช้งานในช่วงเวลาที่เลือก"}
          </div>
        ) : (
          <LinesChart days={days} series={chartSeries} maxY={maxY} />
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-3 block md:hidden text-xs text-gray-500">
          รวมทั้งหมด: <span className="font-semibold text-indigo-700">{total}</span> ครั้ง
        </div>
      </div>

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </section>
  );
}

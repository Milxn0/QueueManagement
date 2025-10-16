/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { exportReservationsXLSX } from "@/utils/exportReservationsXLSX";
import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { monthRangeFromYYYYMM } from "@/utils/date";
import type { ExportMode } from "@/types/analytics";
import {
  ExportControlsBar,
  HeaderCard,
  MonthPickerMobile,
  AnalyticsChartSection,
} from "@/components/admin/analytics";
import { useExportControls } from "@/hooks/analytics";
import {
  buildReservationSeries,
  exportReservationsCSV,
} from "@/utils/analytics";
import SummaryCards from "@/components/admin/analytics/SummaryCards";
import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import type { SupabaseClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);

  const initialMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);

  const { startISO, endISO, daysInMonth } = useMemo(
    () => monthRangeFromYYYYMM(selectedMonth),
    [selectedMonth]
  );

  const {
    mode,
    setMode,
    dayVal,
    setDayVal,
    monthVal,
    setMonthVal,
    yearVal,
    setYearVal,
    exporting,
    setExporting,
  } = useExportControls();

  const exportCSV = useCallback(
    (m: ExportMode, d: string, mo: string, y: string) =>
      exportReservationsCSV(
        supabase as unknown as SupabaseClient<
          any,
          "public",
          "public",
          any,
          any
        >,
        m,
        d,
        mo,
        y,
        setExporting
      ),
    [supabase, setExporting]
  );


  const exportXLSX = useCallback(
  (m: ExportMode, d: string, mo: string, y: string) =>
    exportReservationsXLSX(
      supabase as unknown as SupabaseClient<
        any,
        "public",
        "public",
        any,
        any
      >,
      m,
      d,
      mo,
      y,
      setExporting
    ),
  [supabase, setExporting]
);


  const { loading, err, rows } = useAnalyticsData({
    supabase,
    dataset: "reservations",
    startISO,
    endISO,
    debouncedName: "",
  });

  const { series, maxY } = useMemo(
    () => buildReservationSeries(rows, daysInMonth),
    [rows, daysInMonth]
  );

  const hasNoData = useMemo(
    () => !loading && series.every((s) => s.values.every((v) => v === 0)),
    [loading, series]
  );

  const chartTitle = "อัตราการจอง";
  const { totalCount, paidCount, cancelCount } = useMemo(() => {
    let total = 0,
      paid = 0,
      cancel = 0;
    for (const r of rows ?? []) {
      total++;
      const s = String((r as any).status ?? "").toLowerCase();
      if (s === "paid") paid++;
      else if (s === "cancel" || s === "cancelled") cancel++;
    }
    return { totalCount: total, paidCount: paid, cancelCount: cancel };
  }, [rows]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <HeaderCard />

      <section className="mb-6 rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <label className="text-xs text-gray-500">
              เลือกเดือนสำหรับดูสถิติ
            </label>
            <div className="mt-2 hidden md:block">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm bg-white"
                aria-label="เลือกเดือน (เดสก์ท็อป)"
              />
            </div>
            <div className="mt-2 md:hidden">
              <MonthPickerMobile
                value={selectedMonth}
                onChange={setSelectedMonth}
              />
            </div>
          </div>

          {/* Export */}
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-2 text-xs text-gray-500">Export สถิการจอง</div>
            <ExportControlsBar
              mode={mode}
              setMode={setMode}
              dayVal={dayVal}
              setDayVal={setDayVal}
              monthVal={monthVal}
              setMonthVal={setMonthVal}
              yearVal={yearVal}
              setYearVal={setYearVal}
              exporting={exporting || loading}
              onExport={exportCSV}
              onExportExcel={exportXLSX}
            />
          </div>
        </div>
      </section>
      {/* Summary cards */}
      <div className="mb-6">
        <SummaryCards
          total={totalCount}
          paid={paidCount}
          cancelled={cancelCount}
        />
      </div>
      {/* Chart Section */}
      <AnalyticsChartSection
        titleLeft={chartTitle}
        startISO={startISO}
        endISO={endISO}
        loading={loading}
        err={err}
        hasNoData={hasNoData}
        daysInMonth={daysInMonth}
        series={series}
        maxY={maxY}
      />
    </main>
  );
}

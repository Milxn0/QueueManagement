"use client";

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
import { useExportControls, useAnalyticsData } from "@/hooks/analytics";
import {
  buildReservationSeries,
  exportReservationsCSV,
} from "@/utils/analytics";

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);

  // เดือนเริ่มต้น (YYYY-MM)
  const initialMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);

  // ขอบเขตวันที่ของเดือนนั้น ๆ + จำนวนวันในเดือน
  const { startISO, endISO, daysInMonth } = useMemo(
    () => monthRangeFromYYYYMM(selectedMonth),
    [selectedMonth]
  );

  // แถบควบคุมการ Export
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
      exportReservationsCSV(supabase, m, d, mo, y, setExporting),
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

  const chartTitle = "กราฟการจอง (ต่อวัน)";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <HeaderCard
        selectedMonth={selectedMonth}
        onChangeMonth={setSelectedMonth}
      />

      <section className="mb-6 rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-gray-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
          </div>

          {/* quick month (mobile) */}
          <MonthPickerMobile
            value={selectedMonth}
            onChange={setSelectedMonth}
          />

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
          />
        </div>
      </section>

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

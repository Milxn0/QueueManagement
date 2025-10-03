/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { monthRangeFromYYYYMM } from "@/utils/date";
import type { ExportMode } from "@/types/analytics";
import {
  ExportControlsBar,
  DatasetTabs,
  UserSearchBox,
  UserVisibleToggle,
  HeaderCard,
  MonthPickerMobile,
  AnalyticsChartSection,
} from "@/components/admin/analytics";
import {
  useExportControls,
  useAnalyticsFilters,
  useUsersSummary,
  useAnalyticsData,
} from "@/hooks/analytics";
import {
  buildReservationSeries,
  buildUsersSeries,
  exportReservationsCSV,
} from "@/utils/analytics";

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);

  const initialMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const { startISO, endISO, daysInMonth } = useMemo(
    () => monthRangeFromYYYYMM(selectedMonth),
    [selectedMonth]
  );
  const {
    dataset,
    setDataset,
    name,
    setName,
    visible,
    debouncedName,
    toggle,
    clearName,
  } = useAnalyticsFilters();

  const { loading, err, rows, userDaily, byName } = useAnalyticsData({
    supabase,
    dataset,
    startISO,
    endISO,
    debouncedName,
  });

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

  const { series, maxY, totals } = useMemo(() => {
    if (dataset === "reservations") {
      return buildReservationSeries(rows, daysInMonth);
    }
    return buildUsersSeries({
      daysInMonth,
      startISO,
      debouncedName,
      byName,
      userDaily,
      visible,
    });
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
  const roleTotals = useUsersSummary();

  const hasNoData = useMemo(
    () => !loading && series.every((s) => s.values.every((v) => v === 0)),
    [loading, series]
  );

  const chartTitle = useMemo(
    () =>
      dataset === "reservations"
        ? "กราฟการจอง (ต่อวัน)"
        : "กราฟการใช้งานของผู้ใช้ (ต่อวัน)",
    [dataset]
  );
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
            {/* dataset segmented */}
            <DatasetTabs dataset={dataset} onChange={setDataset} />

            {dataset === "users" && (
              <UserSearchBox
                value={name}
                onChange={setName}
                onClear={clearName}
              />
            )}

            {dataset === "users" && !debouncedName.trim() && (
              <UserVisibleToggle visible={visible} onToggle={toggle} />
            )}
          </div>

          {/* quick month (mobile) */}
          <MonthPickerMobile
            value={selectedMonth}
            onChange={setSelectedMonth}
          />

          {dataset === "reservations" && (
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
          )}
        </div>
      </section>

      {/* Summary cards */}
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

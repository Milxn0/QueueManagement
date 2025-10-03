"use client";
import LinesChart from "@/components/admin/LinesChart";
import { niceMax } from "@/utils/analytics/chart";
import { formatBangkok } from "@/utils/date";
import type { LineSeries } from "@/types/chart";

type Props = {
  titleLeft: string;
  startISO: string;
  endISO: string;
  loading: boolean;
  err: string | null;
  hasNoData: boolean;
  daysInMonth: number;
  series: LineSeries[];
  maxY: number;
};

export default function AnalyticsChartSection({
  titleLeft, startISO, endISO, loading, err, hasNoData, daysInMonth, series, maxY,
}: Props) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-800">{titleLeft}</h2>
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
          <LinesChart days={daysInMonth} series={series} maxY={niceMax(maxY)} />
        )}
      </div>
    </section>
  );
}

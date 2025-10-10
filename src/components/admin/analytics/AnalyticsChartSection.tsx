/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SimpleBars from "@/components/admin/analytics/SimpleBars";
import StatusPie from "@/components/admin/analytics/StatusPie";
import { formatBangkok } from "@/utils/date";
import { niceMax } from "@/utils/analytics/chart";
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
  titleLeft,
  startISO,
  endISO,
  loading,
  err,
  hasNoData,
  daysInMonth,
  series,
  maxY,
}: Props) {
  const [selIndex, setSelIndex] = useState<number | null>(null);
  const [pieLoading, setPieLoading] = useState(false);
  const [pieErr, setPieErr] = useState<string | null>(null);
  const [pieData, setPieData] = useState<{
    paid: number;
    cancel: number;
  } | null>(null);

  async function handleSelect(index: number) {
    try {
      setSelIndex(index);
      setPieLoading(true);
      setPieErr(null);

      const url = new URL(
        "/api/admin/analytics/status-count-by-day",
        window.location.origin
      );
      url.searchParams.set("start", startISO);
      url.searchParams.set("index", String(index));

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { paid: number; cancel: number };
      setPieData(json);
    } catch (e: any) {
      setPieErr(e?.message ?? "load pie failed");
      setPieData(null);
    } finally {
      setPieLoading(false);
    }
  }

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
          <>
            <SimpleBars
              days={daysInMonth}
              series={series}
              maxY={niceMax(maxY)}
              onSelect={handleSelect}
            />

            {selIndex !== null && (
              <div className="mt-6 rounded-xl border bg-white p-4">
                <div className="mb-2 text-sm font-medium text-gray-900">
                  สัดส่วน Paid / Cancel ของวันที่ {selIndex + 1}
                </div>

                {pieLoading ? (
                  <div className="text-sm text-gray-500">กำลังโหลด...</div>
                ) : pieErr ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-sm">
                    {pieErr}
                  </div>
                ) : pieData ? (
                  <StatusPie paid={pieData.paid} cancel={pieData.cancel} />
                ) : (
                  <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

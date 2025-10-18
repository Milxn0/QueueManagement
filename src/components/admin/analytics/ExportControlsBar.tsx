"use client";
import React from "react";
import type { ExportMode } from "@/types/analytics";

type Props = {
  mode: ExportMode;
  setMode: (m: ExportMode) => void;
  dayVal: string;
  setDayVal: (v: string) => void;
  monthVal: string;
  setMonthVal: (v: string) => void;
  yearVal: string;
  setYearVal: (v: string) => void;
  exporting: boolean;
  onExport: (m: ExportMode, d: string, mo: string, y: string) => void;
  onExportExcel?: (m: ExportMode, d: string, mo: string, y: string) => void; // ✅ เพิ่ม prop ใหม่
};

export default function ExportControlsBar(props: Props) {
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
    onExport,
    onExportExcel, 
  } = props;

  return (
    <div className="flex flex-wrap items-end gap-2">
      {/* โหมดเลือกช่วงเวลา */}
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as ExportMode)}
        className="rounded-xl border px-3 py-2 text-sm"
      >
        <option value="all">ทั้งหมด</option>
        <option value="day">รายวัน</option>
        <option value="month">รายเดือน</option>
        <option value="year">รายปี</option>
      </select>

{/* เลือกวันที่/เดือน/ปี */}
{mode !== "all" && mode === "day" && (
  <input
    type="date"
    value={dayVal}
    onChange={(e) => setDayVal(e.target.value)}
    className="rounded-xl border px-3 py-2 text-sm"
  />
)}
{mode !== "all" && mode === "month" && (
  <input
    type="month"
    value={monthVal}
    onChange={(e) => setMonthVal(e.target.value)}
    className="rounded-xl border px-3 py-2 text-sm"
  />
)}
{mode !== "all" && mode === "year" && (
  <input
    type="number"
    min={2000}
    max={9999}
    value={yearVal}
    onChange={(e) => setYearVal(e.target.value)}
    className="w-24 rounded-xl border px-3 py-2 text-sm"
  />
)}

      {/* ปุ่ม Export CSV */}
      <button
        onClick={() => onExport(mode, dayVal, monthVal, yearVal)}
        disabled={exporting}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {exporting ? "กำลังส่งออก…" : "ส่งออก CSV"}
      </button>

      {/* ปุ่ม Export Excel */}
      {onExportExcel && (
        <button
          onClick={() => onExportExcel(mode, dayVal, monthVal, yearVal)}
          disabled={exporting}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {exporting ? "กำลังส่งออก…" : "ส่งออก Excel"}
        </button>
      )}
    </div>
  );
}

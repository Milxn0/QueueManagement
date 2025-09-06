"use client";

import React from "react";
import { statusClass } from "@/utils/status";

export type HistoryRow = {
  id: string;
  reservation_datetime: string | null;
  queue_code: string | null;
  partysize: number | string | null;
  status: string | null;
  tbl?: { table_name: string | null } | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(d);
};

export default function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-50 border-b">
            <th className="px-4 py-3 font-semibold text-gray-700">คิว/โค้ด</th>
            <th className="px-4 py-3 font-semibold text-gray-700">วันที่-เวลา</th>
            <th className="px-4 py-3 font-semibold text-gray-700">จำนวน</th>
            <th className="px-4 py-3 font-semibold text-gray-700">โต๊ะ</th>
            <th className="px-4 py-3 font-semibold text-gray-700">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                ยังไม่มีประวัติการจอง
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-gray-800">{r.queue_code ?? "-"}</td>
                <td className="px-4 py-3 text-gray-700">{formatDate(r.reservation_datetime)}</td>
                <td className="px-4 py-3 text-gray-700">
                  {typeof r.partysize === "number" ? r.partysize : r.partysize ?? "-"}
                </td>
                <td className="px-4 py-3 text-gray-700">{r.tbl?.table_name ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(
                      r.status
                    )}`}
                  >
                    {r.status ?? "-"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

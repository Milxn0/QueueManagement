"use client";
import React from "react";
import { statusClass, statusLabel } from "@/utils/status";
import { Row } from "@/types/queuerow";


const formatDate = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(d);
};

export default function ManageQueueTable({
  displayRows,
  rowsLoading = false,
  openDetail,
}: {
  displayRows: Row[];
  rowsLoading?: boolean;
  openDetail: (r: Row) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left bg-gray-50 border-b">
          <th className="px-4 py-3 font-semibold text-gray-700">คิว/โค้ด</th>
          <th className="px-4 py-3 font-semibold text-gray-700">ผู้จอง</th>
          <th className="px-4 py-3 font-semibold text-gray-700">วันที่-เวลา</th>
          <th className="px-4 py-3 font-semibold text-gray-700">
            จำนวนที่นั่ง
          </th>
          <th className="px-4 py-3 font-semibold text-gray-700">สถานะ</th>
          <th className="px-4 py-3 font-semibold text-gray-700"></th>
        </tr>
      </thead>
      <tbody>
        {rowsLoading ? (
          [...Array(6)].map((_, i) => (
            <tr key={i} className="border-b">
              <td className="px-4 py-3">
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
              </td>
              <td className="px-4 py-3">
                <div className="h-5 w-20 bg-gray-200 animate-pulse rounded-full" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-36 bg-gray-200 animate-pulse rounded" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
              </td>
            </tr>
          ))
        ) : displayRows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
              ไม่พบข้อมูลตามเงื่อนไข/คำค้นหา
            </td>
          </tr>
        ) : (
          displayRows.map((r) => {
            const size =
              typeof r.partysize === "string"
                ? r.partysize
                : typeof r.partysize === "number"
                ? r.partysize.toString()
                : "-";
            return (
              <tr key={r.id} className="border-b hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {r.queue_code ?? "-"}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {r.user?.name ? (r.user?.name as string).slice(0, 24) : "-"}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatDate(r.reservation_datetime)}
                </td>
                <td className="px-4 py-3 text-gray-700">{size}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(
                      r.status
                    )}`}
                    title={r.status ?? "-"}
                  >
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openDetail(r)}
                    className="inline-flex items-center rounded-xl bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-900"
                  >
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

"use client";
import React from "react";
import { statusClass, statusLabel } from "@/utils/status";
import { Row } from "@/types/queuerow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";

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
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="text-left">
              <th className="px-5 py-4 font-semibold">คิว/โค้ด</th>
              <th className="px-5 py-4 font-semibold">ผู้จอง</th>
              <th className="px-5 py-4 font-semibold">วันที่-เวลา</th>
              <th className="px-5 py-4 font-semibold">จำนวนที่นั่ง</th>
              <th className="px-5 py-4 font-semibold">สถานะ</th>
              <th className="px-5 py-4 font-semibold min-w-[180px]"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rowsLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4">
                    <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-5 w-24 bg-gray-200 animate-pulse rounded-full" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-8 w-28 bg-gray-200 animate-pulse rounded-xl" />
                  </td>
                </tr>
              ))
            ) : displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500"
                >
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
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-indigo-50/40"
                  >
                    <td className="px-5 py-4 font-semibold text-indigo-700">
                      {r.queue_code ?? "-"}
                    </td>
                    <td className="px-5 py-4 text-gray-800">
                      {r.user?.name
                        ? (r.user?.name as string).slice(0, 24)
                        : "-"}
                    </td>
                    <td className="px-5 py-4 text-gray-800">
                      {formatDate(r.reservation_datetime)}
                    </td>
                    <td className="px-5 py-4 text-gray-800">{size}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                          r.status
                        )}`}
                        title={r.status ?? "-"}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openDetail(r)}
                        className="inline-flex items-center rounded-xl gap-2 bg-indigo-600 text-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 whitespace-nowrap"
                      >
                        <FontAwesomeIcon icon={faEye} />
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

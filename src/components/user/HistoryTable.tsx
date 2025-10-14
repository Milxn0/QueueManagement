/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import { statusClass } from "@/utils/status";

type RowLike = {
  id: string;
  reservation_datetime: string | null;
  queue_code: string | null;
  partysize: number | string | null;
  comment: string | null;
  status: string | null;
  // ใช้สำหรับดึงชื่อผู้จอง
  users?: { name: string | null } | null;
  user?: { name: string | null } | null;
  name?: string | null;
  customer_name?: string | null;
  user_name?: string | null;
  [k: string]: any;
};

type Props = {
  rows: RowLike[];
  onOpenDetail?: (r: RowLike) => void;
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

// ชื่อผู้จอง (พยายามรองรับทุกเคสของฟิลด์)
const reserverName = (r: RowLike) =>
  r.users?.name?.trim() ||
  r.user?.name?.trim() ||
  r.name?.trim() ||
  r.customer_name?.trim() ||
  r.user_name?.trim() ||
  "-";

export default function HistoryTable({ rows, onOpenDetail }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-700">
              <th className="px-5 py-4 font-semibold">คิว/โค้ด</th>
              <th className="px-5 py-4 font-semibold">ผู้จอง</th>
              <th className="px-5 py-4 font-semibold">วันที่-เวลา</th>
              <th className="px-5 py-4 font-semibold">จำนวน</th>
              <th className="px-5 py-4 font-semibold">สถานะ</th>
              <th className="px-5 py-4 font-semibold min-w-[160px]">
                การจัดการ
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  ยังไม่มีประวัติการจอง
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-5 py-4 font-semibold text-indigo-700">
                    {r.queue_code ?? "-"}
                  </td>

                  <td className="px-5 py-4 text-gray-800">{reserverName(r)}</td>

                  <td className="px-5 py-4 text-gray-800">
                    {formatDate(r.reservation_datetime)}
                  </td>

                  <td className="px-5 py-4 text-gray-800">
                    {typeof r.partysize === "number"
                      ? r.partysize
                      : r.partysize ?? "-"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(
                        r.status
                      )}`}
                    >
                      {r.status ?? "-"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <button
                      onClick={() => onOpenDetail?.(r)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 whitespace-nowrap"
                    >
                      <FontAwesomeIcon icon={faEye} />
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

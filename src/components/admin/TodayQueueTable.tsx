/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React from "react";
import type { OccupiedItem } from "@/components/ReservationDetailModal";
import { statusClass, statusLabel } from "@/utils/status";

type ReservationRow = {
  id: string;
  reservation_datetime: string | null;
  queue_code: string | null;
  status: string | null;
  partysize: number | string | null;
  user?: { name?: string | null; phone?: string | null; email?: string | null };
  tbl?: { table_name?: string | null };
};
// ---- local helpers ----
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

export default function TodayQueueTable({
  rows,
  onOpenDetail,
  onConfirm,
  rowsLoading = false,
}: {
  rows: {
    id: string;
    reservation_datetime: string | null;
    queue_code: string | null;
    status: string | null;
    partysize: number | string | null;
    user?: {
      name?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
    tbl?: { table_name?: string | null } | null;
  }[];
  onOpenDetail: (r: any) => void;
  onConfirm: (id: string) => Promise<void>;
  rowsLoading?: boolean;
}) {
  return (
    <>
      {rowsLoading ? (
        <tbody>
          <tr>
            <td colSpan={8} className="p-6 text-center text-gray-500">
              กำลังโหลด...
            </td>
          </tr>
        </tbody>
      ) : rows.length === 0 ? (
        <tbody>
          <tr>
            <td colSpan={8} className="p-6 text-center text-gray-500">
              ไม่พบข้อมูล
            </td>
          </tr>
        </tbody>
      ) : (
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium text-gray-800">
                {r.queue_code ?? "-"}
              </td>
              <td className="px-4 py-3 text-gray-700">
                {r.user?.name ? (r.user?.name as string).slice(0, 8) : "-"}
              </td>
              <td className="px-4 py-3 text-gray-700">
                {formatDate(r.reservation_datetime)}
              </td>
              <td className="px-4 py-3 text-gray-700">{r.partysize ?? "-"}</td>
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
                  onClick={() => onOpenDetail(r)}
                  className="inline-flex items-center rounded-xl bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-900"
                >
                  ดูรายละเอียด
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      )}
    </>
  );
}

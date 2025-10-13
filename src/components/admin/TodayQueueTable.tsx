/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React from "react";
import { statusClass, statusLabel } from "@/utils/status";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
const getCustomerName = (r: any): string => {
  return (
    r?.user?.name ?? r?.customer_name ?? r?.name ?? r?.profile?.name ?? "-"
  );
};

const getPartySize = (r: any): string | number => {
  const v =
    r?.partysize ??
    r?.party_size ??
    r?.people ??
    r?.people_count ??
    r?.guests ??
    r?.qty ??
    null;
  return v == null || v === "" ? "-" : v;
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
            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
              กำลังโหลด...
            </td>
          </tr>
        </tbody>
      ) : rows.length === 0 ? (
        <tbody></tbody>
      ) : (
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-indigo-50/40">
              <td className="px-5 py-4 font-semibold text-indigo-700">
                {r.queue_code ?? "-"}
              </td>

              <td className="px-5 py-4 text-gray-800">
                {String(getCustomerName(r)).slice(0, 24)}
              </td>

              <td className="px-5 py-4 text-gray-800">
                {formatDate(r.reservation_datetime)}
              </td>

              <td className="px-5 py-4 text-gray-800">{getPartySize(r)}</td>

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
                  onClick={() => onOpenDetail(r)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 whitespace-nowrap"
                >
                  <FontAwesomeIcon icon={faEye} />
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

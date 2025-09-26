/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import { statusClass } from "@/utils/status";
import { normalizeStatus } from "@/utils/reservation";

type RowLike = {
  id: string;
  reservation_datetime: string | null;
  queue_code: string | null;
  partysize: number | string | null;
  status: string | null;
  tbl?: { table_name: string | null } | null;
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

function tableCellText(r: RowLike) {
  const s = normalizeStatus(r?.status);
  if (s.includes("cancel")) return { text: "ยกเลิกแล้ว", cls: "text-rose-600" };

  const name =
    r.tbl?.table_name ??
    (r as any).table_name ??
    (r as any).table_no ??
    (r as any).table_id ??
    null;

  if (!name) return { text: "ยังไม่มีโต๊ะ", cls: "text-gray-500" };
  return { text: `${String(name).trim()}`, cls: "text-gray-800" };
}

export default function HistoryTable({ rows, onOpenDetail }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-700">
              <th className="px-5 py-4 font-semibold">คิว/โค้ด</th>
              <th className="px-5 py-4 font-semibold">วันที่-เวลา</th>
              <th className="px-5 py-4 font-semibold">จำนวน</th>
              <th className="px-5 py-4 font-semibold">โต๊ะ</th>
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
              rows.map((r) => {
                const t = tableCellText(r);
                return (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-indigo-50/40"
                  >
                    <td className="px-5 py-4 font-semibold text-indigo-700">
                      {r.queue_code ?? "-"}
                    </td>

                    <td className="px-5 py-4 text-gray-800">
                      {formatDate(r.reservation_datetime)}
                    </td>

                    <td className="px-5 py-4 text-gray-800">
                      {typeof r.partysize === "number"
                        ? r.partysize
                        : r.partysize ?? "-"}
                    </td>

                    <td className={`px-5 py-4 ${t.cls}`}>{t.text}</td>

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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

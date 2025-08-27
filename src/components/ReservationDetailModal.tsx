"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faXmark } from "@fortawesome/free-solid-svg-icons";

type ReservationForDetail = {
  id: string;
  queue_code: string | null;
  reservation_datetime: string | null;
  partysize: number | string | null;
  status: string | null;
  user?: { name: string | null } | null;
  cancelled_by?: { name: string | null; role?: string | null } | null;
  cancelled_reason?: string | null;
};

type Props = {
  open: boolean;
  row: ReservationForDetail | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void> | void;
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
};

const statusClass = (s: string | null) => {
  const v = (s ?? "").toLowerCase();
  if (v.includes("cancel")) return "bg-red-100 text-red-700";
  if (v === "pending") return "bg-yellow-100 text-yellow-700";
  if (v === "confirm" || v === "confirmed") return "bg-indigo-100 text-indigo-700";
  if (v === "seated") return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-700";
};

export default function ReservationDetailModal({
  open,
  row,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !row) return null;

  const v = (row.status ?? "").toLowerCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* backdrop */}
      <button
        aria-label="close-backdrop"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">รายละเอียดคิว</h3>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-gray-500 hover:text-gray-700"
            aria-label="ปิด"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="space-y-2 text-sm text-gray-700 mb-4">
          <div><span className="text-gray-500">คิว/โค้ด:</span> {row.queue_code ?? "-"}</div>
          <div><span className="text-gray-500">ผู้จอง:</span> {row.user?.name ?? "-"}</div>
          <div><span className="text-gray-500">วันที่-เวลา:</span> {formatDate(row.reservation_datetime)}</div>
          <div>
            <span className="text-gray-500">จำนวนที่นั่ง:</span>{" "}
            {typeof row.partysize === "number" ? row.partysize : row.partysize ?? "-"}
          </div>
          <div>
            <span className="text-gray-500">สถานะ:</span>
            <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>
              {row.status ?? "-"}
            </span>
          </div>

          {v.includes("cancel") && (
            <div className="pt-2 border-t">
              <div className="text-gray-500">ผู้ยกเลิก:</div>
              <div className="text-xs">
                {row.cancelled_by
                  ? `${row.cancelled_by.role ?? "—"} : ${row.cancelled_by.name ?? "—"}`
                  : "—"}
              </div>
              {row.cancelled_reason && (
                <div className="text-xs text-gray-500">สาเหตุ: {row.cancelled_reason}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          {v === "pending" && (
            <button
              type="button"
              onClick={async () => {
                await onConfirm(row.id);
                onClose();
              }}
              className="rounded-xl bg-amber-500 text-white px-4 py-2 hover:bg-amber-600"
            >
              ยืนยันคิว
            </button>
          )}

          {(v === "confirm" || v === "confirmed") && (
            <Link
              href={`/admin/table?reservation=${row.id}`}
              onClick={onClose}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
            >
              เลือกโต๊ะ
            </Link>
          )}

          {v === "seated" && (
            <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
              จัดการคิวเสร็จสิ้น
              <FontAwesomeIcon icon={faCircleCheck} />
            </span>
          )}

          {v.includes("cancel") && (
            <span className="text-rose-600 font-semibold inline-flex items-center gap-1">
              ยกเลิกแล้ว
              <FontAwesomeIcon icon={faCircleCheck} />
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2 hover:bg-gray-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

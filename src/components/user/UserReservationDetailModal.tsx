/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faCircleCheck,
  faInfo,
} from "@fortawesome/free-solid-svg-icons";
import { statusClass } from "@/utils/status";
import { toLocalInputValue, localInputToISO } from "@/utils/date";

type RowLike = {
  id: string;
  reservation_datetime: string | null;
  queue_code: string | null;
  partysize: number | string | null;
  status: string | null;
  cancelled_reason?: string | null;
  cancelled_by_user_id?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: {
    id: string;
    name?: string | null;
    role?: string | null;
  } | null;

  // อาจชื่อคีย์ไม่เหมือนกันในแต่ละ query
  user?: { name?: string | null } | null;
  users?: { name?: string | null } | null;
  tbl?: { table_name?: string | null } | null; // join tables
  table_name?: string | null; // บางเคส select มาเป็นคอลัมน์ตรง
  user_id?: string | null;

  // fallback name field อื่น ๆ ที่บางเพจอาจมี
  name?: string | null;
  customer_name?: string | null;
  user_name?: string | null;
};

type Props = {
  open: boolean;
  row: RowLike;
  onClose: () => void;
  onSubmitEdit: (id: string, iso: string, size: number) => Promise<void>;
  onCancelWithReason: (id: string, reason: string) => Promise<void>;
  fallbackName?: string;
};

const TH_TZ = "Asia/Bangkok";

/* ---------- Helpers ---------- */
const formatDisplayDate = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TH_TZ,
  }).format(d);
};

function tableText(r: RowLike) {
  const s = (r?.status ?? "").toLowerCase();
  if (s.includes("seated")) return "นั่งแล้ว";
  if (s.includes("cancel")) return "ยกเลิกแล้ว";
  if (s.includes("done")) return "เสร็จสิ้น";
  return "ยังไม่มีโต๊ะ";
}

/* ---------- Component ---------- */

export default function UserReservationDetailModal({
  open,
  row,
  onClose,
  onSubmitEdit,
  onCancelWithReason,
  fallbackName,
}: Props) {
  const [busy, setBusy] = useState(false);

  // steps
  const [editStep, setEditStep] = useState<0 | 1>(0);
  const [cancelStep, setCancelStep] = useState<0 | 1>(0);

  // local display (optimistic)
  const [displayDatetime, setDisplayDatetime] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState<number | string | null>(null);

  // edit form
  const [editDateTime, setEditDateTime] = useState<string>("");
  const [editPartySize, setEditPartySize] = useState<number | string>("");

  // cancel form
  const [cancelReason, setCancelReason] = useState<string>("");

  // success banner (ให้ UI เหมือนตัวอย่าง)
  const [ok, setOk] = useState<string | null>(null);

  // sync local fields when row changes
  useEffect(() => {
    if (!row || !open) return;
    setDisplayDatetime(row.reservation_datetime ?? null);
    setDisplaySize(row.partysize ?? null);
    setEditDateTime(
      row.reservation_datetime
        ? toLocalInputValue(row.reservation_datetime, TH_TZ) ?? ""
        : ""
    );
    setEditPartySize(
      typeof row.partysize === "number"
        ? row.partysize
        : Number(row.partysize || 1)
    );
    setCancelReason(row.cancelled_reason ?? "");
    setEditStep(0);
    setCancelStep(0);
    setOk(null);
  }, [row, open]);

  const tCell = tableText(row || ({} as RowLike));

  const displayName =
    row?.users?.name?.trim() ||
    row?.user?.name?.trim() ||
    String((row as any)?.name ?? "").trim() ||
    String((row as any)?.customer_name ?? "").trim() ||
    String((row as any)?.user_name ?? "").trim() ||
    fallbackName?.trim?.() ||
    "—";

  const status = (row?.status ?? "").toLowerCase();
  const allowEdit = status === "waiting" || status === "confirmed";
  const canCancel = status === "waiting" || status === "confirmed";

  const saveEdit = async () => {
    if (!allowEdit || busy) return;
    const iso = localInputToISO(editDateTime);
    const size = Number(editPartySize);
    if (!Number.isFinite(size) || size <= 0) {
      alert("จำนวนคนต้องเป็นตัวเลขมากกว่า 0");
      return;
    }
    try {
      setBusy(true);
      await onSubmitEdit(row.id, iso, size);
      // optimistic UI
      setDisplayDatetime(iso);
      setDisplaySize(size);
      setEditStep(0);
      setOk("บันทึกสำเร็จ");
      setTimeout(() => setOk(null), 1600);
    } catch (e: any) {
      alert(e?.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const saveCancel = async () => {
    if (busy) return;
    if (!canCancel) {
      alert("ไม่สามารถยกเลิกคิวเมื่อสถานะเป็น Seated");
      return;
    }
    try {
      setBusy(true);
      await onCancelWithReason(row.id, cancelReason || "—");
      setCancelStep(0);
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "ยกเลิกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        aria-label="close-backdrop"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                <FontAwesomeIcon icon={faInfo} />
                รายละเอียดคิว
              </div>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">
                {displayName}
              </h3>
              <div className="mt-1 text-xs text-gray-600">
                รหัสคิว{" "}
                <span className="font-medium text-indigo-700">
                  {row.queue_code ?? "—"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition hover:bg-white hover:text-gray-700"
              aria-label="ปิด"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Success banner */}
          {ok && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
              {ok}
            </div>
          )}

          {/* Info grid (สไตล์การ์ดอ่อน ๆ แบบตัวอย่าง) */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <div className="text-xs text-gray-500">วันเวลา</div>
              <div className="mt-1 font-medium text-gray-900">
                {formatDisplayDate(displayDatetime)}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <div className="text-xs text-gray-500">จำนวนที่นั่ง</div>
              <div className="mt-1 font-medium text-gray-900">
                {String(displaySize ?? "—")}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3 md:col-span-2">
              <div className="text-xs text-gray-500">สถานะ</div>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                  row?.status ?? ""
                )}`}
              >
                {row?.status ?? "—"}
              </span>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3 md:col-span-2">
              <div className="text-xs text-gray-500">โต๊ะ</div>
              <div className="mt-1 font-medium text-gray-900">
                {row?.tbl?.table_name || row?.table_name || "ยังไม่มีโต๊ะ"}
              </div>
            </div>
          </div>
          {/* Cancelled info box (โชว์เมื่อยกเลิกแล้ว) */}
          {status.includes("cancel") && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <div className="text-sm font-semibold mb-3">ข้อมูลการยกเลิก</div>

              <div className="text-sm">
                <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-2">
                  <span className="text-rose-700/80">ผู้ยกเลิก :</span>
                  <span className="font-medium break-words">
                    {row.cancelled_by?.name?.trim() || "—"}
                  </span>

                  <span className="text-rose-700/80">สาเหตุ :</span>
                  <span className="font-medium whitespace-pre-line break-words">
                    {row?.cancelled_reason?.trim?.() || "—"}
                  </span>

                  <span className="text-rose-700/80">ยกเลิกเมื่อ :</span>
                  <span className="font-medium">
                    {formatDisplayDate(row?.cancelled_at ?? null)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions (ให้หน้าตา/โทนปุ่มเหมือนตัวอย่าง) */}
          {editStep === 0 && cancelStep === 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <div className="mt-2 text-[11px] text-gray-500">
                หมายเหตุ: สามารถแก้ไขรายละเอียดได้เฉพาะสถานะ{" "}
                <span className="font-medium">'Waiting'และะ 'Confirmed'</span>{" "}
                เท่านั้น และเมื่อสถานะเป็น{" "}
                <span className="font-medium">'Seated'</span>{" "}
                จะไม่สามารถยกเลิกคิวได้
              </div>

              {allowEdit && (
                <button
                  type="button"
                  onClick={() => setEditStep(1)}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition hover:bg-amber-50"
                  disabled={busy}
                >
                  แก้ไขรายละเอียด
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setCancelStep(1)}
                  className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
                  disabled={busy}
                >
                  ยกเลิกคิว
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="ml-auto rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
          )}

          {/* Edit drawer (โทน Amber ตามตัวอย่าง) */}
          {editStep === 1 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-amber-900">
                  แก้ไขรายละเอียดคิว
                </div>
                <div className="text-[11px] text-amber-700">
                  ปรับวันเวลา / จำนวนที่นั่ง
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-white px-3 py-3">
                  <label className="block text-xs text-gray-600 mb-1">
                    วันเวลา (ใหม่)
                  </label>
                  <input
                    type="datetime-local"
                    value={editDateTime}
                    onChange={(e) => setEditDateTime(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>

                <div className="rounded-xl border bg-white px-3 py-3">
                  <label className="block text-xs text-gray-600 mb-1">
                    จำนวนที่นั่ง (ใหม่)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editPartySize}
                    onChange={(e) => setEditPartySize(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                    placeholder="เช่น 2"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setCancelStep(1)}
                    className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
                    disabled={busy}
                  >
                    ยกเลิกคิว
                  </button>
                )}

                <button
                  type="button"
                  onClick={saveEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
                  disabled={busy}
                >
                  <FontAwesomeIcon icon={faCircleCheck} />
                  บันทึกการแก้ไข
                </button>
              </div>
            </div>
          )}

          {/* Cancel drawer (โทน Rose ตามตัวอย่าง) */}
          {cancelStep === 1 && canCancel && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-white p-4 ring-1 ring-rose-100">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-rose-900">
                  ระบุเหตุผลการยกเลิก <span className="text-rose-600">*</span>
                </label>
                <span className="text-xs text-rose-500">
                  อย่างน้อย 3 ตัวอักษร
                </span>
              </div>
              <textarea
                rows={4}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-rose-200 bg-rose-50/30 px-3 py-2 text-sm outline-none transition placeholder:text-rose-300 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-200"
                placeholder="เช่น ไม่สะดวกมา/จองซ้ำซ้อน/อื่น ๆ"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancelStep(0);
                    setCancelReason("");
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                  disabled={busy}
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={saveCancel}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                  disabled={busy || cancelReason.trim().length < 3}
                  title={
                    cancelReason.trim().length < 3
                      ? "กรอกอย่างน้อย 3 ตัวอักษร"
                      : ""
                  }
                >
                  <FontAwesomeIcon icon={faCircleCheck} />
                  ยืนยันการยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

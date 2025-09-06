"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { OccupiedItem, Props } from "@/types/reservationdetail";

const TH_TZ = "Asia/Bangkok";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/* ---------- Helpers ---------- */

// parse date string from DB safely (supports "YYYY-MM-DD HH:mm:ss")
const parseDate = (value: string | null) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;

  const withT = raw.replace(" ", "T");
  d = new Date(withT);
  if (!Number.isNaN(d.getTime())) return d;

  const withTZ = withT.endsWith("Z") ? withT : withT + "Z";
  d = new Date(withTZ);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value: string | null) => {
  const d = parseDate(value);
  return d
    ? d.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: TH_TZ,
      })
    : "-";
};

const formatTime = (value: string) => {
  const d = parseDate(value);
  return d
    ? d.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TH_TZ,
      })
    : "-";
};

const statusClass = (s: string | null) => {
  const v = (s ?? "").toLowerCase();
  if (v.includes("cancel"))
    return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
  if (v === "pending")
    return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  if (v === "confirm" || v === "confirmed")
    return "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200";
  if (v === "seated")
    return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
};

// show queue code or a shortened reservationId
const showOccCode = (o?: {
  queue_code?: string | null;
  reservationId?: string | null;
}) => {
  const q = (o?.queue_code ?? "").trim();
  if (q) return q;
  const rid = (o?.reservationId ?? "").trim();
  return rid ? rid.slice(0, 6) : "-";
};

/* ---------- Component ---------- */

export default function ReservationDetailModal({
  open,
  row,
  onClose,
  onConfirm,
  onCancel,
  currentTableNo,
  occupied,
  onAssignTable,
  onMoveTable,
  readOnly = false,
  fromManageQueue = false,
}: Props) {
  // ---------- Hooks ----------
  const [localStatus, setLocalStatus] = useState<string>(
    (row?.status ?? "").toLowerCase()
  );
  useEffect(() => {
    setLocalStatus((row?.status ?? "").toLowerCase());
  }, [row?.id, row?.status, open]);

  const status = localStatus;
  const [busy, setBusy] = useState(false);

  // cancel with reason
  const [cancelStep, setCancelStep] = useState<0 | 1>(0);
  const [reason, setReason] = useState("");
  const minReasonLen = 3;

  // table picking
  const [tableStep, setTableStep] = useState<0 | 1>(0);
  const tables = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 1), []);
  const occByTable = useMemo(() => {
    const m = new Map<number, OccupiedItem>();
    occupied.forEach((o) => m.set(o.tableNo, o));
    return m;
  }, [occupied]);

  if (!open || !row) return null;

  const handleClose = () => {
    setCancelStep(0);
    setTableStep(0);
    setReason("");
    onClose();
  };

  const submitCancel = async () => {
    if (reason.trim().length < minReasonLen) return;
    try {
      setBusy(true);
      await onCancel(row.id, reason.trim());
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  const conflictMessage = (targetTable: number): string | null => {
    const occ = occByTable.get(targetTable);
    if (!occ || !row.reservation_datetime) return null;

    const a = parseDate(row.reservation_datetime);
    const b = parseDate(occ.reservation_datetime);
    if (!a || !b) return null;

    const diff = Math.abs(a.getTime() - b.getTime());
    if (diff < TWO_HOURS_MS) {
      return `โต๊ะ ${targetTable} ถูกใช้ใกล้เวลา (คิว ${showOccCode(
        occ
      )} เวลา ${formatTime(
        occ.reservation_datetime
      )}) — ต้องห่างอย่างน้อย 2 ชั่วโมง`;
    }
    return null;
  };

  const doPickTable = async (no: number) => {
    if (busy) return;
    const msg = conflictMessage(no);
    if (msg) {
      alert(msg);
      return;
    }
    try {
      setBusy(true);
      if (currentTableNo != null) {
        await onMoveTable(row.id, currentTableNo, no);
      } else {
        await onAssignTable(row.id, no);
      }
      setLocalStatus("seated");
      setTableStep(0);
    } finally {
      setBusy(false);
    }
  };

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
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                รายละเอียดคิว
              </div>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">
                {row.user?.name ?? "—"}
              </h3>
              <div className="mt-1 text-xs text-gray-600">
                รหัสคิว{" "}
                <span className="font-medium text-indigo-700">
                  {row.queue_code ?? "—"}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-gray-500 transition hover:bg-white hover:text-gray-700"
              aria-label="ปิด"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Info grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <div className="text-xs text-gray-500">วันเวลา</div>
              <div className="mt-1 font-medium text-gray-900">
                {formatDate(row.reservation_datetime)}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <div className="text-xs text-gray-500">จำนวนที่นั่ง</div>
              <div className="mt-1 font-medium text-gray-900">
                {typeof row.partysize === "number"
                  ? row.partysize
                  : row.partysize ?? "—"}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3 md:col-span-2">
              <div className="text-xs text-gray-500">สถานะ</div>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                  status
                )}`}
              >
                {status ?? "—"}
              </span>
              {currentTableNo != null && (
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {fromManageQueue ? "โต๊ะที่นั่ง" : "โต๊ะปัจจุบัน"}:{" "}
                  {currentTableNo}
                </span>
              )}
            </div>
          </div>

          {/* Cancel info */}
          {status.includes("cancel") && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3">
              <div className="text-xs text-rose-700">ข้อมูลการยกเลิก</div>
              <div className="mt-1 text-sm text-rose-900">
                ผู้ยกเลิก:{" "}
                <span className="font-medium">
                  {row.cancelled_by
                    ? `${row.cancelled_by.role ?? "—"} : ${
                        row.cancelled_by.name ?? "—"
                      }`
                    : "—"}
                </span>
              </div>
              {row.cancelled_reason && (
                <div className="mt-1 text-xs text-rose-700">
                  สาเหตุ: {row.cancelled_reason}
                </div>
              )}
            </div>
          )}

          {/* Step: pick table */}
          {!readOnly && tableStep === 1 && (
            <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-indigo-800">
                  เลือกโต๊ะ (1–17)
                </div>
                <div className="text-[11px] text-indigo-600">
                  เงื่อนไข: คิวต้องห่างกันอย่างน้อย 2 ชม.
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {tables.map((no) => {
                  const occ = occByTable.get(no);
                  const conflict = conflictMessage(no) !== null;
                  const isCurrent = currentTableNo === no;

                  return (
                    <button
                      key={no}
                      onClick={() => doPickTable(no)}
                      disabled={busy || conflict || isCurrent}
                      className={[
                        "rounded-xl border px-3 py-2 text-left transition",
                        isCurrent
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : occ
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                        conflict ? "opacity-60" : "",
                      ].join(" ")}
                      title={
                        conflict
                          ? conflictMessage(no) ?? ""
                          : occ
                          ? `มีคิว ${showOccCode(occ)} เวลา ${formatTime(
                              occ.reservation_datetime
                            )}`
                          : "ว่าง"
                      }
                    >
                      <div className="text-sm font-semibold">โต๊ะ {no}</div>
                      <div className="text-[11px]">
                        {isCurrent
                          ? fromManageQueue
                            ? "โต๊ะที่นั่ง"
                            : "โต๊ะปัจจุบัน"
                          : occ
                          ? ` ${showOccCode(occ)}`
                          : "ว่าง"}
                      </div>

                      {occ && (
                        <div className="text-[11px] text-slate-500">
                          {formatTime(occ.reservation_datetime)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTableStep(0)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
                  disabled={busy}
                >
                  ย้อนกลับ
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!readOnly && tableStep === 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              {status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => setCancelStep(1)}
                    className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
                  >
                    ยกเลิกคิว
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onConfirm(row.id);
                      handleClose();
                    }}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600"
                  >
                    ยืนยันคิว
                  </button>
                </>
              )}

              {(status === "confirm" || status === "confirmed") && (
                <button
                  type="button"
                  onClick={() => {
                    setCancelStep(0);
                    setTableStep(1);
                  }}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                >
                  {currentTableNo != null ? "ย้ายโต๊ะ" : "เลือกโต๊ะ"}
                </button>
              )}

              {status === "seated" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCancelStep(0);
                      setTableStep(1);
                    }}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    ย้ายโต๊ะ
                  </button>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    จัดการคิวเสร็จสิ้น
                    <FontAwesomeIcon icon={faCircleCheck} />
                  </span>
                </>
              )}

              {status.includes("cancel") && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                  ยกเลิกแล้ว
                  <FontAwesomeIcon icon={faCircleCheck} />
                </span>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="ml-auto rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
          )}

          {/* Cancel reason form */}
          {!readOnly && cancelStep === 1 && tableStep === 0 && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4 ring-1 ring-rose-100">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-rose-900">
                  ระบุเหตุผลการยกเลิก <span className="text-rose-600">*</span>
                </label>
                <span className="text-xs text-rose-500">
                  อย่างน้อย {minReasonLen} ตัวอักษร
                </span>
              </div>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-rose-200 bg-rose-50/30 px-3 py-2 text-sm outline-none transition placeholder:text-rose-300 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-200"
                placeholder="เช่น ลูกค้าไม่สะดวกมาในเวลานี้ / จองซ้ำซ้อน / อื่น ๆ"
              />
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCancelStep(0);
                    setReason("");
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                  disabled={busy}
                >
                  ย้อนกลับ
                </button>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs ${
                      reason.trim().length < minReasonLen
                        ? "text-rose-500"
                        : "text-emerald-600"
                    }`}
                  >
                    {reason.trim().length} ตัวอักษร
                  </span>
                  <button
                    type="button"
                    onClick={submitCancel}
                    disabled={busy || reason.trim().length < minReasonLen}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                    title={
                      reason.trim().length < minReasonLen
                        ? `กรอกอย่างน้อย ${minReasonLen} ตัวอักษร`
                        : ""
                    }
                  >
                    {busy ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

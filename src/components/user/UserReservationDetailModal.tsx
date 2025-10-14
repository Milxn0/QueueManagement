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
import { useAssignedTables } from "@/hooks/useAssignedTables";
import PaidSummary from "../admin/reservation-detail/PaidSummary";

type RowLike = {
  id: string;
  reservation_datetime: string | null;
  queue_code: string | null;
  partysize: number | string | null;
  status: string | null;
  comment: string | null;
  cancelled_reason?: string | null;
  cancelled_by_user_id?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: {
    id: string;
    name?: string | null;
    role?: string | null;
  } | null;

  user?: { name?: string | null } | null;
  users?: { name?: string | null } | null;
  tbl?: { table_name?: string | null } | null;
  table_name?: string | null;
  user_id?: string | null;

  name?: string | null;
  customer_name?: string | null;
  user_name?: string | null;
};

type Props = {
  open: boolean;
  row: RowLike;
  onClose: () => void;
  onSubmitEdit: (
    id: string,
    iso: string,
    size: number,
    cmedit: string
  ) => Promise<void>;
  onCancelWithReason: (id: string, reason: string) => Promise<void>;
  fallbackName?: string;
};

const TH_TZ = "Asia/Bangkok";
const formatTHB = (n: number | null | undefined) =>
  typeof n === "number"
    ? new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
      }).format(n)
    : "—";

type PaymentState = {
  method: string | null;
  total: number | null;
  paidAt: string | null;
  packageQty: number;
  packages: { name: string; unitPrice: number; qty: number }[];
  alaItems: { name: string; unitPrice: number; qty: number }[];
  pkgSubtotal: number;
  alaSubtotal: number;
} | null;

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
  if (s.includes("paid")) return "ชำระเงินแล้ว";
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
  const { assigned, load: loadAssignedTables } = useAssignedTables(
    row?.id ?? null
  );
  const normStatus = (row?.status ?? "").toLowerCase();
  const isPaid = normStatus === "paid";
  const [showPkg, setShowPkg] = useState(false);
  const [payment, setPayment] = useState<PaymentState>(null);
  const [showItems, setShowItems] = useState(false);
  // steps
  const [editStep, setEditStep] = useState<0 | 1>(0);
  const [cancelStep, setCancelStep] = useState<0 | 1>(0);

  // local display (optimistic)
  const [displayDatetime, setDisplayDatetime] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState<number | string | null>(null);
  const [displayComment, setDisplayComment] = useState<string | null>(null);
  // edit form
  const [editDateTime, setEditDateTime] = useState<string>("");
  const [editPartySize, setEditPartySize] = useState<number | string>("");
  const [editComment, setEditComment] = useState<string>("");

  // cancel form
  const [cancelReason, setCancelReason] = useState<string>("");

  // success banner (ให้ UI เหมือนตัวอย่าง)
  const [ok, setOk] = useState<string | null>(null);
  const displayPhone =
    (
      (row as any)?.phone ??
      (row as any)?.users?.phone ??
      (row as any)?.user?.phone ??
      ""
    )
      ?.toString()
      ?.trim() || null;

  // sync local fields when row changes
  useEffect(() => {
    if (!row || !open) return;
    setDisplayDatetime(row.reservation_datetime ?? null);
    setDisplaySize(row.partysize ?? null);
    setDisplayComment(row.comment ?? null);
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
    setEditComment(row?.comment ?? "");
    setCancelReason(row.cancelled_reason ?? "");
    setEditStep(0);
    setCancelStep(0);
    setOk(null);
  }, [row, open]);

  useEffect(() => {
    if (!open || !row?.id) return;

    (async () => {
      try {
        const { data: bill } = await (await import("@/lib/supabaseClient"))
          .createClient()
          .from("bills")
          .select("id, payment_method, total, created_at, status")
          .eq("reservation_id", row.id)
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!bill) {
          setPayment(null);
          return;
        }

        const supabase = (await import("@/lib/supabaseClient")).createClient();

        const { data: pkgRows } = await supabase
          .from("bill_items")
          .select("name_snapshot, unit_price, quantity")
          .eq("bill_id", bill.id)
          .eq("kind", "package");

        const packages = (pkgRows ?? []).map((it: any) => ({
          name: String(it?.name_snapshot ?? "Package"),
          unitPrice: Number(it?.unit_price ?? 0),
          qty: Number(it?.quantity ?? 0),
        }));
        const packageQty = packages.reduce(
          (s: any, it: { qty: any }) => s + it.qty,
          0
        );
        const pkgSubtotal = packages.reduce(
          (s: number, it: { unitPrice: number; qty: number }) =>
            s + it.unitPrice * it.qty,
          0
        );

        const { data: alaRows } = await supabase
          .from("bill_items")
          .select("name_snapshot, unit_price, quantity")
          .eq("bill_id", bill.id)
          .in("kind", ["item", "modifier"]);

        const alaItems = (alaRows ?? []).map((it: any) => ({
          name: String(it?.name_snapshot ?? "Item"),
          unitPrice: Number(it?.unit_price ?? 0),
          qty: Number(it?.quantity ?? 0),
        }));
        const alaSubtotal = alaItems.reduce(
          (s: number, it: { unitPrice: number; qty: number }) =>
            s + it.unitPrice * it.qty,
          0
        );

        setPayment({
          method: bill.payment_method ?? null,
          total: Number(bill.total ?? 0),
          paidAt: bill.created_at ?? null,
          packageQty,
          packages,
          alaItems,
          pkgSubtotal,
          alaSubtotal,
        });
      } catch {
        setPayment(null);
      }
    })();

    // โหลดรายการโต๊ะที่ถูก assign
    loadAssignedTables();
  }, [open, row?.id, loadAssignedTables]);

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
    const cmedit = editComment;
    if (!Number.isFinite(size) || size <= 0) {
      alert("จำนวนคนต้องเป็นตัวเลขมากกว่า 0");
      return;
    }
    try {
      setBusy(true);
      await onSubmitEdit(row.id, iso, size, cmedit);
      // optimistic UI
      setDisplayDatetime(iso);
      setDisplaySize(size);
      setDisplayComment(cmedit);
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
              <div className="mt-1 text-xs opacity-90">
                เบอร์โทรติดต่อ{" "}
                <span className="font-medium text-indigo-700">
                  {displayPhone ?? "—"}
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
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Info grid */}

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-xs text-gray-500">วันเวลา</div>
              <div className="mt-1 font-medium text-gray-900">
                {formatDisplayDate(displayDatetime)}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-xs text-gray-500">จำนวนที่นั่ง</div>
              <div className="mt-1 font-medium text-gray-900">
                {String(displaySize ?? "—")}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-xs text-gray-500">สถานะ</div>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                  row?.status ?? ""
                )}`}
              >
                {row?.status ?? "—"}
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-xs text-gray-500">โต๊ะ</div>
              <div className="mt-1 flex flex-wrap items-center gap-1 max-h-[72px] overflow-auto pr-1">
                {assigned && assigned.length > 0 ? (
                  assigned.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                      title={t.name}
                    >
                      โต๊ะ: {t.no ?? t.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs">ยังไม่มีโต๊ะ</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="mt-1 whitespace-pre-wrap break-words font-medium text-gray-900">
                {displayComment?.toString().trim()
                  ? displayComment
                  : "ไม่มีข้อมูลเพิ่มเติม"}
              </div>
            </div>
          </section>
          {/* Cancelled info box  */}
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

          {/* Actions */}
          {editStep === 0 && cancelStep === 0 && (
            <>
              <div className="mt-2 text-[11px] text-gray-500">
                หมายเหตุ: สามารถแก้ไขรายละเอียดได้เฉพาะสถานะ{" "}
                <span className="font-medium">'Waiting'และะ 'Confirmed'</span>{" "}
                เท่านั้น และเมื่อสถานะเป็น{" "}
                <span className="font-medium">'Seated'</span>{" "}
                จะไม่สามารถยกเลิกคิวได้
              </div>

              {/* แถวปุ่ม: ซ้าย = ยกเลิก/แก้ไข, ขวา = ปิด */}
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
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
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
                >
                  ปิด
                </button>
              </div>
            </>
          )}

          {/* สรุปการชำระเงิน */}
          <PaidSummary
            payment={payment}
            isPaid={isPaid}
            showPkg={showPkg}
            setShowPkg={(u) => setShowPkg(u)}
          />

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
                    วันเวลา
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
                    จำนวนที่นั่ง
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

                <div className="rounded-xl border bg-white px-3 py-3">
                  <label className="block text-xs text-gray-600 mb-1">
                    ข้อมูลเพิ่มเติม
                  </label>
                  <input
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                    placeholder="แก้ไขข้อมูลเพิ่มเติม"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setEditStep(0)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                  disabled={busy}
                >
                  ย้อนกลับ
                </button>

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

          {/* Cancel drawer */}
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

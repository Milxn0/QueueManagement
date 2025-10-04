/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCircleCheck,
  faInfo,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabaseClient";
import type { OccupiedItem, Props } from "@/types/reservationdetail";
import { useRouter } from "next/navigation";
import PaymentStep from "@/components/admin/PaymentStep";
import { statusClass } from "@/utils";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

const TH_TZ = "Asia/Bangkok";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/* ---------- Helpers ---------- */
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

const toInputLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
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
const formatDisplayDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TH_TZ,
  }).format(d);
};

const formatTHB = (n?: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
      }).format(n);

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
  onUpdated,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  async function refreshRow() {
    if (!row?.id) return;
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `
      id, reservation_datetime, status, partysize, comment, cancelled_at,
      cancelled_reason, cancelled_by_user_id
    `
      )
      .eq("id", row.id)
      .single();

    if (error) {
      console.error(error);
      return;
    }
    // อัปเดตฟิลด์ที่โชว์ในโมดอล
    setLocalStatus((data?.status ?? "").toLowerCase());
    setDisplayDatetime(data?.reservation_datetime ?? null);
    setDisplayPartysize(data?.partysize ?? null);
    setDisplayComment(data?.comment ?? null);
  }

  async function loadPaymentInfo(reservationId: string) {
    const { data: bill, error } = await supabase
      .from("bills")
      .select("id, payment_method, total, created_at")
      .eq("reservation_id", reservationId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !bill) {
      setPayment(null);
      return;
    }

    // packages
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

    // a la carte
    const { data: alaRows } = await supabase
      .from("bill_items")
      .select("name_snapshot, unit_price, quantity, kind")
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
  }

  const [localStatus, setLocalStatus] = useState<string>(
    (row?.status ?? "").toLowerCase()
  );
  const [busy, setBusy] = useState(false);

  const displayStatus = localStatus || row?.status || "—";
  const normStatus = useMemo(
    () => (displayStatus || "").toLowerCase(),
    [displayStatus]
  );
  // steps
  const [cancelStep, setCancelStep] = useState<0 | 1>(0);
  const [tableStep, setTableStep] = useState<0 | 1>(0);
  const [editStep, setEditStep] = useState<0 | 1>(0);

  // edit form
  const [editDate, setEditDate] = useState<string>("");
  const [editSize, setEditSize] = useState<string>("");
  const [editComment, setEditComment] = useState<string>("");

  // cancel reason
  const [reason, setReason] = useState("");
  const minReasonLen = 3;

  //Payment State
  const [showPayment, setShowPayment] = useState(false);

  const [optimisticTableNo, setOptimisticTableNo] = useState<number | null>(
    currentTableNo ?? null
  );

  const [confirmDelOpen, setConfirmDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  const [ok, setOk] = useState<string | null>(null);
  const [displayDatetime, setDisplayDatetime] = useState<string | null>(
    row?.reservation_datetime ?? null
  );
  const [displayPartysize, setDisplayPartysize] = useState<
    number | string | null
  >(row?.partysize ?? null);
  const [displayComment, setDisplayComment] = useState<string | null>(
    row?.comment ?? null
  );
  const [showPkg, setShowPkg] = useState(false);
  const [payment, setPayment] = useState<{
    method: string | null;
    total: number | null;
    paidAt: string | null;
    packageQty: number;
    packages: { name: string; unitPrice: number; qty: number }[];
    alaItems: { name: string; unitPrice: number; qty: number }[];
    pkgSubtotal: number;
    alaSubtotal: number;
  } | null>(null);

  const tables = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 1), []);
  const occByTable = useMemo(() => {
    const m = new Map<number, OccupiedItem>();
    (occupied ?? []).forEach((o) => m.set(o.tableNo, o));
    return m;
  }, [occupied]);

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data: u } = await supabase
          .from("users")
          .select("role")
          .eq("id", uid)
          .single();
        setIsAdmin((u?.role ?? "").toLowerCase() === "admin");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    setLocalStatus((row?.status ?? "").toLowerCase());
    setDisplayDatetime(row?.reservation_datetime ?? null);
    setDisplayPartysize(row?.partysize ?? null);
    setDisplayComment(row?.comment ?? null);
    const d = parseDate(row?.reservation_datetime ?? null);
    setEditDate(d ? toInputLocal(d) : "");
    setEditSize(
      row?.partysize == null || (row.partysize as unknown as string) === ""
        ? ""
        : String(row.partysize)
    );
    setEditComment(row?.comment ?? "");
    setCancelStep(0);
    setTableStep(0);
    setEditStep(0);
    setReason("");
    setOk(null);
    setShowPayment(false);
    setShowPayment(false);
    setOptimisticTableNo(currentTableNo ?? null);
  }, [row?.id, open, currentTableNo]);

  useEffect(() => {
    if (open && row?.id && normStatus === "paid") {
      loadPaymentInfo(row.id);
    }
  }, [open, row?.id, normStatus]);
  if (!open || !row) return null;

  const handleClose = () => {
    setCancelStep(0);
    setTableStep(0);
    setEditStep(0);
    setReason("");
    setOk(null);
    onClose();
  };

  const submitCancel = async () => {
    if (reason.trim().length < minReasonLen) return;
    try {
      setBusy(true);
      await onCancel(row.id, reason.trim());
      onUpdated?.();
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  const shownTableNo = optimisticTableNo ?? currentTableNo;

  const conflictMessage = (targetTable: number): string | null => {
    if (normStatus !== "seated") return null;

    const occ = occByTable.get(targetTable);
    if (!occ || !displayDatetime) return null;

    const a = parseDate(displayDatetime);
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

    if (normStatus === "paid") {
      alert("ออเดอร์นี้ชำระเงินแล้ว ไม่สามารถเลือกหรือย้ายโต๊ะได้");
      return;
    }

    const msg = conflictMessage(no);
    if (msg) {
      alert(msg);
      return;
    }

    const prevTable = optimisticTableNo ?? null;

    try {
      setBusy(true);

      setOptimisticTableNo(no);
      setLocalStatus("seated");
      setTableStep(0);

      if (currentTableNo != null) {
        await onMoveTable(row.id, currentTableNo, no);
      } else {
        await onAssignTable(row.id, no);
      }

      onUpdated?.();
    } catch (e: any) {
      setOptimisticTableNo(prevTable);
      setLocalStatus((row?.status ?? "").toLowerCase());
      alert("ไม่สามารถจัดโต๊ะให้ได้: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const capitalize = (s?: string | null) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "—";

  const saveEdit = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const payload: Record<string, unknown> = {};
      if (editDate)
        payload.reservation_datetime = new Date(editDate).toISOString();
      if (editSize !== "") {
        const n = Number(editSize);
        payload.partysize = Number.isFinite(n) ? n : null;
      }
      if (editComment?.trim()) payload.comment = editComment.trim();

      if (Object.keys(payload).length === 0) {
        setEditStep(0);
        return;
      }
      const { error } = await supabase
        .from("reservations")
        .update(payload)
        .eq("id", row.id);
      if (error) {
        alert("บันทึกไม่สำเร็จ: " + error.message);
        return;
      }

      // optimistic
      if (payload.reservation_datetime)
        setDisplayDatetime(payload.reservation_datetime as string);
      if ("partysize" in payload)
        setDisplayPartysize(payload.partysize as number | null);
      if ("comment" in payload) {
        setDisplayComment((payload.comment as string | null) ?? null);
      }
      setEditStep(0);
      setOk("แก้ไขสำเร็จ");
      onUpdated?.();

      setTimeout(() => setOk(null), 1600);
    } finally {
      setBusy(false);
    }
  };

  function handleSavePayment(payload: {
    selectedPackage: number | null;
    people: number;
    alaItems: { name: string; qty: number; price: number }[];
    totals: { pkg: number; ala: number; sum: number };
  }) {
    setOk("บันทึกการชำระเงินสำเร็จ");
    onUpdated?.();
    setTimeout(() => setOk(null), 1600);
  }
  const alaQty = (payment?.alaItems ?? []).reduce(
    (s, it) => s + (it.qty ?? 0),
    0
  );

  const hasAnyBillItems =
    !!payment &&
    ((payment.packageQty ?? 0) > 0 || (payment.alaItems?.length ?? 0) > 0);

  const AUTO_CANCEL_UUID = "00000000-0000-0000-0000-000000000001";

  // Delete reservation (and related bills & bill_items)
  const handleDeleteReservation = async () => {
    if (!isAdmin || !row?.id) return;
    try {
      setDelBusy(true);
      setDelErr(null);

      const { data: bills } = await supabase
        .from("bills")
        .select("id")
        .eq("reservation_id", row.id);

      const billIds = (bills ?? []).map((b: any) => b.id);
      if (billIds.length > 0) {
        const { error: delItemsErr } = await supabase
          .from("bill_items")
          .delete()
          .in("bill_id", billIds);
        if (delItemsErr) throw delItemsErr;

        const { error: delBillsErr } = await supabase
          .from("bills")
          .delete()
          .in("id", billIds);
        if (delBillsErr) throw delBillsErr;
      }

      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", row.id);
      if (error) throw error;

      onUpdated?.();

      setConfirmDelOpen(false);
      handleClose();
    } catch (e: any) {
      setDelErr(e?.message || "ลบไม่สำเร็จ");
    } finally {
      setDelBusy(false);
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
                <FontAwesomeIcon icon={faInfo} />
                รายละเอียดคิว
              </div>
              <h3 className="mt-2 text-lg font-semibold">
                {row.user?.name ?? "—"}
              </h3>
              <div className="mt-1 text-xs opacity-90">
                รหัสคิว{" "}
                <span className="font-medium text-indigo-700">
                  {row.queue_code ?? "—"}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-2 transition hover:bg-white/20"
              aria-label="ปิด"
              title="ปิด"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Body */}
        {!showPayment && (
          <div className="px-6 py-5">
            {/* Success banner (toast-like) */}
            {ok && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-700">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className="text-emerald-600"
                />
                <span>{ok}</span>
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
                <div className="text-xs text-gray-500">วันเวลา</div>
                <div className="mt-1 font-medium text-gray-900">
                  {formatDate(displayDatetime)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
                <div className="text-xs text-gray-500">จำนวนที่นั่ง</div>
                <div className="mt-1 font-medium text-gray-900">
                  {typeof displayPartysize === "number"
                    ? displayPartysize
                    : displayPartysize ?? "—"}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
                <div className="text-xs text-gray-500">ข้อมูลเพิ่มเติม</div>
                <div className="mt-1 font-medium text-gray-900">
                  {String(displayComment ?? "ไม่มีข้อมูลเพิ่มเติม")}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3 md:col-span-2">
                <div className="text-xs text-gray-500">สถานะ</div>
                <span
                  className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                    normStatus
                  )}`}
                >
                  {displayStatus || "—"}
                </span>
                {shownTableNo != null && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {normStatus === "paid" || fromManageQueue
                      ? "โต๊ะที่นั่ง"
                      : "โต๊ะปัจจุบัน"}
                    : {shownTableNo}
                  </span>
                )}
              </div>
            </div>

            {normStatus === "paid" && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                  <div className="text-xs text-emerald-700">
                    ช่องทางการชำระเงิน
                  </div>
                  <div className="mt-1 font-medium text-emerald-900">
                    {payment?.method || "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-emerald-700">
                      แพ็กเกจทั้งหมด
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPkg((v) => !v)}
                      disabled={!hasAnyBillItems}
                      className="text-[11px] font-medium text-emerald-700 hover:underline disabled:text-emerald-300"
                    >
                      ดูรายละเอียด
                    </button>
                  </div>
                  <div className="mt-1">
                    <div className="font-medium text-emerald-900">
                      {(payment?.packageQty ?? 0) + alaQty}
                    </div>
                    <div className="text-[11px] text-emerald-700/70">
                      บุฟเฟต์ {payment?.packageQty ?? 0} • เมนูเพิ่ม {alaQty}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                  <div className="text-xs text-emerald-700">ราคารวม</div>
                  <div className="mt-1 font-medium text-emerald-900">
                    {formatTHB(payment?.total)}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                  <div className="text-xs text-emerald-700">เวลาที่ชำระ</div>
                  <div className="mt-1 font-medium text-emerald-900">
                    {formatDisplayDate(payment?.paidAt ?? null)}
                  </div>
                </div>
              </div>
            )}

            {showPkg && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                <div className="mb-2 text-sm font-semibold text-emerald-800">
                  รายละเอียดแพ็กเกจทั้งหมด
                </div>
                {payment && payment.packages.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-emerald-50 text-emerald-800">
                        <tr>
                          <th className="px-3 py-2 text-left">แพ็กเกจ</th>
                          <th className="px-3 py-2 text-right">ราคา/หน่วย</th>
                          <th className="px-3 py-2 text-right">จำนวน</th>
                          <th className="px-3 py-2 text-right">รวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {payment.packages.map((p, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{p.name}</td>
                            <td className="px-3 py-2 text-right">
                              {formatTHB(p.unitPrice)}
                            </td>
                            <td className="px-3 py-2 text-right">{p.qty}</td>
                            <td className="px-3 py-2 text-right">
                              {formatTHB(p.unitPrice * p.qty)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td className="px-3 py-2 text-right" colSpan={3}>
                            รวมแพ็กเกจ
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatTHB(payment?.pkgSubtotal ?? 0)}
                          </td>
                        </tr>
                        <tr className="font-semibold">
                          <td className="px-3 py-2 text-right" colSpan={3}>
                            รวมเมนูเพิ่ม
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatTHB(payment?.alaSubtotal ?? 0)}
                          </td>
                        </tr>
                        <tr className="font-semibold">
                          <td className="px-3 py-2 text-right" colSpan={3}>
                            รวมทั้งสิ้น
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatTHB(
                              (payment?.pkgSubtotal ?? 0) +
                                (payment?.alaSubtotal ?? 0)
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    {payment?.alaItems?.length ? (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-emerald-50 text-emerald-800">
                            <tr>
                              <th className="px-3 py-2 text-left">เมนูเพิ่ม</th>
                              <th className="px-3 py-2 text-right">
                                ราคา/หน่วย
                              </th>
                              <th className="px-3 py-2 text-right">จำนวน</th>
                              <th className="px-3 py-2 text-right">รวม</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {payment.alaItems.map((p, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2">{p.name}</td>
                                <td className="px-3 py-2 text-right">
                                  {formatTHB(p.unitPrice)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {p.qty}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatTHB(p.unitPrice * p.qty)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    ไม่พบรายการแพ็กเกจ
                  </div>
                )}
              </div>
            )}

            {/* Cancel info */}
            {normStatus.includes("cancel") && (
              <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900">
                <div className="mb-3 text-sm font-semibold">
                  ข้อมูลการยกเลิก
                </div>

                <div className="space-y-2 text-sm">
                  {/* 1) Role */}
                  <div>
                    <span className="text-red-700">บทบาทผู้ยกเลิก:</span>{" "}
                    <span className="font-medium">
                      {row.cancelled_by_user_id === AUTO_CANCEL_UUID
                        ? "ระบบอัตโนมัติ"
                        : capitalize(row.cancelled_by?.role) || "—"}
                    </span>
                  </div>

                  {/* 2) Name */}
                  <div>
                    <span className="text-red-700">ชื่อผู้ยกเลิก:</span>{" "}
                    <span className="font-medium">
                      {row.cancelled_by_user_id === AUTO_CANCEL_UUID
                        ? "ระบบอัตโนมัติ"
                        : row.cancelled_by?.name?.trim() || "—"}
                    </span>
                  </div>

                  {/* 3) Reason */}
                  <div>
                    <span className="text-red-700">สาเหตุ:</span>{" "}
                    <span className="break-words whitespace-pre-line font-medium">
                      {row.cancelled_reason?.trim() || "—"}
                    </span>
                  </div>

                  {/* 4) Cancelled_at */}
                  <div>
                    <span className="text-red-700">ยกเลิกเมื่อ:</span>{" "}
                    <span className="font-medium">
                      {formatDisplayDate(row.cancelled_at ?? null)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* EDIT step */}
            {!readOnly && editStep === 1 && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-amber-900">
                    แก้ไขรายละเอียดคิว
                  </div>
                  <div className="text-[11px] text-amber-700">
                    <span className="text-[11px] text-red-600"> *สามารถแก้ไขได้เมื่อลูกค้าบอกเท่านั้น</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-white px-3 py-3">
                    <label className="mb-1 block text-xs text-gray-600">
                      วันเวลา (ใหม่)
                    </label>
                    <input
                      type="datetime-local"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="rounded-xl border bg-white px-3 py-3">
                    <label className="mb-1 block text-xs text-gray-600">
                      จำนวนที่นั่ง (ใหม่)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editSize}
                      onChange={(e) => setEditSize(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
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

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStep(0)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
                    disabled={busy}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
                    disabled={busy}
                  >
                    {busy ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                  </button>
                </div>
              </div>
            )}

            {/* PICK TABLE step */}
            {!readOnly && tableStep === 1 && (
              <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-indigo-800">
                    เลือกโต๊ะ (1–17)
                  </div>
                  <div className="text-[11px] text-indigo-100 sm:text-indigo-600">
                    เงื่อนไข: คิวต้องห่างกันอย่างน้อย 2 ชม.
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {tables.map((no) => {
                    const occ = occByTable.get(no);
                    const conflict = conflictMessage(no) !== null;
                    const curNo = optimisticTableNo ?? currentTableNo;
                    const isCurrent = curNo === no;

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
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
                    disabled={busy}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    ย้อนกลับ
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {fromManageQueue ? (
              <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setDelErr(null);
                      setConfirmDelOpen(true);
                    }}
                    className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-60"
                    disabled={busy}
                    title="ลบการจองนี้"
                  >
                    ลบการจอง
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="ml-auto rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
                >
                  ปิด
                </button>
              </div>
            ) : (
              !readOnly &&
              tableStep === 0 &&
              cancelStep === 0 &&
              editStep === 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                  {!normStatus.includes("cancel") &&
                    normStatus !== "seated" &&
                    normStatus !== "paid" && (
                      <button
                        type="button"
                        onClick={() => {
                          setTableStep(0);
                          setCancelStep(0);
                          setEditStep(1);
                        }}
                        className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition hover:bg-amber-50"
                      >
                        แก้ไขรายละเอียด
                      </button>
                    )}

                  {normStatus === "waiting" && (
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
                          onUpdated?.();
                          handleClose();
                        }}
                        className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600"
                      >
                        ยืนยันคิว
                      </button>
                    </>
                  )}

                  {(normStatus === "confirm" || normStatus === "confirmed") && (
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

                  {normStatus === "seated" && (
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

                      <button
                        type="button"
                        onClick={() => {
                          setShowPayment(true);
                        }}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        ชำระเงิน
                      </button>
                    </>
                  )}

                  {normStatus.includes("cancel") && (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                      ยกเลิกแล้ว
                      <FontAwesomeIcon icon={faCircleCheck} />
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleClose}
                    className="ml-auto rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadowsm transition hover:bg-gray-50"
                  >
                    ปิด
                  </button>
                </div>
              )
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
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
                    disabled={busy}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} />
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
        )}
        <PaymentStep
          open={showPayment}
          onClose={() => setShowPayment(false)}
          peopleInitial={Number(row.partysize) || 1}
          onUpdatePeople={async (newPeople) => {
            const { error } = await supabase
              .from("reservations")
              .update({ partysize: newPeople })
              .eq("id", row.id);
            if (error) throw new Error(error.message);
          }}
          onRefresh={async () => {
            await refreshRow();
            onUpdated?.();
          }}
          onSaved={async (payload) => {
            const isUUID = (s?: string | null) =>
              !!s &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                s
              );

            try {
              setBusy(true);

              const selectedPackage = Number(payload?.selectedPackage) || 0;
              const people = Number(payload?.people) || 1;
              const ala = Array.isArray(payload?.alaItems)
                ? payload.alaItems
                : [];
              const totals = payload?.totals ?? {
                pkg: selectedPackage * people,
                ala: ala.reduce(
                  (s: number, it: any) =>
                    s + Number(it.price || 0) * Number(it.qty || 0),
                  0
                ),
                sum: 0,
              };
              totals.sum = Number(totals.pkg || 0) + Number(totals.ala || 0);

              const { data: billRow, error: billErr } = await supabase
                .from("bills")
                .upsert(
                  {
                    reservation_id: row.id,
                    status: "paid",
                    total: Number(totals.sum || 0),
                    payment_method: payload?.paymentMethod ?? null,
                  },
                  { onConflict: "reservation_id" }
                )
                .select("id")
                .single();

              if (billErr) throw billErr;
              const billId = billRow.id;

              const { error: delErr } = await supabase
                .from("bill_items")
                .delete()
                .eq("bill_id", billId);
              if (delErr) throw delErr;

              const items: any[] = [];

              if (selectedPackage > 0) {
                items.push({
                  bill_id: billId,
                  kind: "package",
                  ref_id: null,
                  name_snapshot: `Package ${selectedPackage}`,
                  unit_price: selectedPackage,
                  quantity: people,
                  parent_item_id: null,
                });
              }

              for (const it of ala) {
                items.push({
                  bill_id: billId,
                  kind: "item",
                  ref_id: isUUID(it?.id) ? it.id : null,
                  name_snapshot: String(it?.name ?? "Item"),
                  unit_price: Number(it?.price || 0),
                  quantity: Number(it?.qty || 0),
                  parent_item_id: null,
                });
              }

              if (items.length > 0) {
                const { error: insErr } = await supabase
                  .from("bill_items")
                  .insert(items);
                if (insErr) throw insErr;
              }

              const { error: resErr } = await supabase
                .from("reservations")
                .update({ status: "paid" })
                .eq("id", row.id);
              if (resErr) throw resErr;

              setShowPayment(false);
              setOk("บันทึกการชำระเงินสำเร็จ");
              await refreshRow();
              await loadPaymentInfo(row.id);
              onUpdated?.();
              setTimeout(() => setOk(null), 1600);
            } catch (e: any) {
              alert(
                "บันทึกการชำระเงินล้มเหลว: " + (e?.message || "Unknown error")
              );
            } finally {
              setBusy(false);
            }
          }}
        />

        {/* Confirm Delete Modal*/}
        {confirmDelOpen && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setConfirmDelOpen(false)}
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-rose-100">
              <div className="flex items-start gap-3 border-b bg-rose-50 px-5 py-4">
                <div className="mt-1 rounded-full bg-rose-100 p-2 text-rose-700">
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-rose-800">
                    ยืนยันการลบการจอง
                  </h4>
                  <p className="mt-0.5 text-xs text-rose-700/80">
                    การลบจะลบข้อมูลที่เกี่ยวข้องทั้งหมด และไม่สามารถกู้คืนได้
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 text-sm">
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2 text-rose-900">
                  <div>
                    <span className="text-rose-700">รหัสคิว:</span>{" "}
                    <span className="font-semibold">
                      {row.queue_code ?? "—"}
                    </span>
                  </div>
                  <div className="text-[12px] text-rose-700/70">
                    ชื่อ: {row.user?.name ?? "—"}
                  </div>
                </div>

                {delErr && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                    {delErr}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  disabled={delBusy}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReservation}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                  disabled={delBusy}
                >
                  {delBusy ? "กำลังลบ..." : "ลบเลย"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

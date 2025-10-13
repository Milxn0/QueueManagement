/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCircleCheck,
  faInfo,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabaseClient";
import type { OccupiedItem, Props } from "@/types/reservationdetail";
import PaymentStep from "@/components/admin/PaymentStep";
import {
  statusClass,
  normalizePaymentMethod,
  paymentMethodLabel,
} from "@/utils/status";
import CancelInfo from "./reservation-detail/CancelInfo";
import {
  TH_TZ,
  parseDate,
  toInputLocal,
  formatDate,
  formatDisplayDate,
  formatTHB,
  fallbackName,
  fallbackPhone,
  parseHHMM,
  isWithinOpenClose,
} from "./reservation-detail/utils";

import PaidSummary from "./reservation-detail/PaidSummary";
import TablePicker from "./reservation-detail/TablePicker";
import ConfirmDeleteModal from "./reservation-detail/ConfirmDeleteModal";

import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuthRole } from "@/hooks/useAuthRole";
import { useAssignedTables } from "@/hooks/useAssignedTables";

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
  const isAdmin = useAuthRole();
  const appSettings = useAppSettings();

  const [localStatus, setLocalStatus] = useState<string>(
    (row?.status ?? "").toLowerCase()
  );
  const displayStatus = localStatus || row?.status || "—";
  const normStatus = useMemo(
    () => (displayStatus || "").toLowerCase(),
    [displayStatus]
  );
  const isPaid = normStatus === "paid";

  // steps & UI local
  const [cancelStep, setCancelStep] = useState<0 | 1>(0);
  const [tableStep, setTableStep] = useState<0 | 1>(0);
  const [editStep, setEditStep] = useState<0 | 1>(0);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [notice, setNotice] = useState<null | {
    type: "success" | "error" | "info";
    text: string;
  }>(null);
  const showError = useCallback(
    (text: string) => setNotice({ type: "error", text }),
    []
  );
  const clearNotice = useCallback(() => setNotice(null), []);

  // data fields
  const [displayDatetime, setDisplayDatetime] = useState<string | null>(
    row?.reservation_datetime ?? null
  );
  const [displayPartysize, setDisplayPartysize] = useState<
    number | string | null
  >(row?.partysize ?? null);
  const [displayComment, setDisplayComment] = useState<string | null>(
    row?.comment ?? null
  );
  const [displayPhone, setDisplayphone] = useState<string | null>(
    fallbackPhone(row)
  );

  // cancel info
  const [cancelledAt, setCancelledAt] = useState<string | null>(
    row?.cancelled_at ?? null
  );
  const [cancelledReason, setCancelledReason] = useState<string | null>(
    row?.cancelled_reason ?? null
  );
  const [cancelledBy, setCancelledBy] = useState<{
    name: string | null;
    role: string | null;
  } | null>(null);

  // edit form
  const [editDate, setEditDate] = useState<string>(() => {
    const d = parseDate(row?.reservation_datetime ?? null);
    return d ? toInputLocal(d) : "";
  });
  const [editSize, setEditSize] = useState<string>(
    row?.partysize == null || (row.partysize as unknown as string) === ""
      ? ""
      : String(row.partysize)
  );
  const [editComment, setEditComment] = useState<string>(row?.comment ?? "");

  // payment
  const [showPayment, setShowPayment] = useState(false);
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

  // tables / pick multiple
  const [optimisticTableNo, setOptimisticTableNo] = useState<number | null>(
    currentTableNo ?? null
  );
  const [tableNos, setTableNos] = useState<number[]>([]);
  const [tableCaps, setTableCaps] = useState<Map<number, number>>(new Map());
  const [picked, setPicked] = useState<number[]>([]);
  const [around, setAround] = useState<OccupiedItem[]>([]);
  const { assigned, load: loadAssignedTables } = useAssignedTables(
    row?.id ?? null
  );

  const myAssignedNos = useMemo(
    () => assigned.map((t) => t.no).filter((n): n is number => n != null),
    [assigned]
  );

  const capacityInfo = useCallback(
    (no: number) => {
      const cap = tableCaps.get(no) ?? null;
      const allowed = cap != null ? cap + 2 : null;
      const size = Number(displayPartysize) || 0;
      const over = allowed != null && size > allowed;
      return { cap, allowed, size, over };
    },
    [tableCaps, displayPartysize]
  );

  const allowedSum = useMemo(
    () =>
      picked.reduce((sum, no) => {
        const cap = tableCaps.get(no) ?? 0;
        return sum + (cap + 2);
      }, 0),
    [picked, tableCaps]
  );

  const requiredSeats = Number(displayPartysize ?? 0) || 0;
  const need = Math.max(0, requiredSeats - allowedSum);
  const canSave = picked.length > 0 && need === 0;

  // delete states
  const [confirmDelOpen, setConfirmDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  // other small states
  const [reason, setReason] = useState("");
  const minReasonLen = 3;
  const [showPkg, setShowPkg] = useState(false);

  const fmtTH = useCallback(
    (iso: string | null) =>
      !iso
        ? null
        : new Date(iso).toLocaleString("th-TH", {
            timeZone: TH_TZ,
            dateStyle: "medium",
            timeStyle: "short",
          }),
    []
  );
  const [cancelledByUserId, setCancelledByUserId] = useState<string | null>(
    row?.cancelled_by_user_id ?? null
  );

  // ---------- loaders ----------
  const refreshRow = useCallback(async () => {
    if (!row?.id) return;

    const { data, error } = await supabase
      .from("reservations")
      .select(
        `
        id, queue_code, reservation_datetime, status, partysize, comment,
        user_id,
        cancelled_at, cancelled_reason, cancelled_by_user_id
      `
      )
      .eq("id", row.id)
      .maybeSingle();

    if (error || !data) return;
    setCancelledByUserId(data?.cancelled_by_user_id ?? null);
    setLocalStatus(String(data?.status ?? "").toLowerCase());
    setDisplayDatetime(data?.reservation_datetime ?? null);
    setDisplayPartysize(data?.partysize ?? null);
    setDisplayComment(data?.comment ?? null);
    setCancelledAt(data?.cancelled_at ?? null);
    setCancelledReason(data?.cancelled_reason ?? null);

    // phone
    let phone: string | null =
      (row as any)?.users?.phone ?? (row as any)?.phone ?? null;
    if (!phone && data?.user_id) {
      const { data: u } = await supabase
        .from("users")
        .select("phone")
        .eq("id", data.user_id)
        .maybeSingle();
      phone = u?.phone ?? phone ?? null;
    }
    setDisplayphone(phone);

    // cancelled by
    let cancelledByLocal: { name: string | null; role: string | null } | null =
      null;
    if ((data as any)?.cancelled_by && (data as any).cancelled_by.id) {
      cancelledByLocal = {
        name: (data as any).cancelled_by?.name ?? null,
        role: (data as any).cancelled_by?.role ?? null,
      };
    } else if (
      data?.cancelled_by_user_id &&
      data.cancelled_by_user_id !== "00000000-0000-0000-0000-000000000001"
    ) {
      const { data: u } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("id", data.cancelled_by_user_id)
        .maybeSingle();
      if (u) cancelledByLocal = { name: u.name ?? null, role: u.role ?? null };
    }
    setCancelledBy(cancelledByLocal);

    await loadAssignedTables();
  }, [row?.id, supabase, loadAssignedTables]);

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
    const packageQty = packages.reduce((s: number, it: any) => s + it.qty, 0);
    const pkgSubtotal = packages.reduce(
      (s: number, it: any) => s + it.unitPrice * it.qty,
      0
    );

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
      (s: number, it: any) => s + it.unitPrice * it.qty,
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

  // initial tables/caps
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("tables")
          .select("id, table_name, capacity, is_available");
        if (error) return;
        const caps = new Map<number, number>();
        const nos: number[] = [];
        const getNoLocal = (name?: string | null) => {
          const m = String(name ?? "").match(/\d+/);
          return m ? Number(m[0]) : null;
        };
        (data ?? []).forEach((t: any) => {
          const no = getNoLocal(t?.table_name);
          const cap = Number(t?.capacity ?? 0);
          if (no != null) {
            nos.push(no);
            if (cap > 0) caps.set(no, cap);
          }
        });
        nos.sort((a, b) => a - b);
        setTableNos(nos);
        setTableCaps(caps);
      } catch {}
    })();
  }, [open, supabase]);

  // occupied around
  useEffect(() => {
    if (!open || tableStep !== 1 || !row?.id) return;
    const dtISO =
      parseDate(displayDatetime ?? null)?.toISOString() ??
      new Date().toISOString();
    const url = `/api/admin/reservations/${
      row.id
    }/occupied?dt=${encodeURIComponent(dtISO)}`;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch occupied fail");
        const list = await res.json();
        setAround(Array.isArray(list) ? list : []);
      } catch {
        setAround([]);
      }
    })();
  }, [open, tableStep, row?.id, displayDatetime]);

  // react to open/row changes
  useEffect(() => {
    setLocalStatus((row?.status ?? "").toLowerCase());
    setDisplayDatetime(row?.reservation_datetime ?? null);
    setDisplayPartysize(row?.partysize ?? null);
    setDisplayComment(row?.comment ?? null);
    setDisplayphone(fallbackPhone(row));
    const d = parseDate(row?.reservation_datetime ?? null);
    setEditDate(d ? toInputLocal(d) : "");
    setEditSize(
      row?.partysize == null || (row.partysize as unknown as string) === ""
        ? ""
        : String(row.partysize)
    );
    setCancelledByUserId(row?.cancelled_by_user_id ?? null);
    setCancelledAt(row?.cancelled_at ?? null);
    setCancelledReason(row?.cancelled_reason ?? null);
    setEditComment(row?.comment ?? "");
    setCancelStep(0);
    setTableStep(0);
    setEditStep(0);
    setReason("");
    setOk(null);
    setShowPayment(false);
    setOptimisticTableNo(currentTableNo ?? null);
    if (open && row?.id) void refreshRow();
  }, [row?.id, open, currentTableNo, refreshRow]);

  // payment load when paid
  useEffect(() => {
    if (open && row?.id && isPaid) loadPaymentInfo(row.id);
  }, [open, row?.id, isPaid]);

  // ensure pkg off when not paid
  useEffect(() => {
    if (!isPaid) setShowPkg(false);
  }, [isPaid]);

  // reset notice on tableStep change
  useEffect(() => {
    if (tableStep === 1) setNotice(null);
  }, [tableStep]);

  const myTableNos = useMemo(() => {
    if (!row?.id && !row?.queue_code) return [];
    return (occupied ?? [])
      .filter(
        (o) =>
          (o as any)?.reservationId === row?.id ||
          (o as any)?.queue_code === row?.queue_code
      )
      .map((o) => o.tableNo);
  }, [occupied, row?.id, row?.queue_code]);

  if (!open || !row) return null;

  const handleClose = () => {
    setCancelStep(0);
    setTableStep(0);
    setEditStep(0);
    setReason("");
    setOk(null);
    setAround([]);
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

  const doPickTable = async (no: number) => {
    if (busy) return;
    const cap = capacityInfo(no);
    if (cap.over) {
      showError(
        `จำนวนที่นั่ง ${cap.size} คน เกินความจุของโต๊ะ ${no} (รองรับ ${cap.cap} คน • อนุโลม +2 = สูงสุด ${cap.allowed} คน)`
      );
      return;
    }
    if (normStatus === "paid") {
      showError("ออเดอร์นี้ชำระเงินแล้ว ไม่สามารถเลือกหรือย้ายโต๊ะได้");
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

      await loadAssignedTables();
      onUpdated?.();
    } catch (e: any) {
      setOptimisticTableNo(prevTable);
      setLocalStatus((row?.status ?? "").toLowerCase());
      showError("ไม่สามารถจัดโต๊ะให้ได้: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const payload: Record<string, unknown> = {};

      if (editDate) {
        const newDt = new Date(editDate);
        const okRange = isWithinOpenClose(
          newDt,
          appSettings?.open_time,
          appSettings?.close_time
        );
        if (!okRange) {
          showError(
            `กรุณาเลือกเวลาในกรอบที่กำหนด ${
              appSettings?.open_time ?? "09:00"
            } - ${appSettings?.close_time ?? "21:00"}`
          );
          setBusy(false);
          return;
        }
        payload.reservation_datetime = newDt.toISOString();
      }

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
        showError("บันทึกไม่สำเร็จ: " + error.message);
        return;
      }

      if (payload.reservation_datetime)
        setDisplayDatetime(payload.reservation_datetime as string);
      if ("partysize" in payload)
        setDisplayPartysize(payload.partysize as number | null);
      if ("comment" in payload)
        setDisplayComment((payload.comment as string | null) ?? null);

      setEditStep(0);
      setOk("แก้ไขสำเร็จ");
      await loadAssignedTables();
      onUpdated?.();
      setTimeout(() => setOk(null), 1600);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!isAdmin || !row?.id) return;
    try {
      setDelBusy(true);
      setDelErr(null);
      const { error: delMapsErr } = await supabase
        .from("reservation_tables")
        .delete()
        .eq("reservation_id", row.id);
      if (delMapsErr) throw delMapsErr;

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

  const ALLOW_DIFF_MIN = 10;
  async function canConfirmThisReservation(
    targetId: string,
    targetISO: string | null
  ) {
    if (!targetId || !targetISO) return true;
    try {
      const { data: earliest, error } = await supabase
        .from("reservations")
        .select("id, reservation_datetime")
        .eq("status", "waiting")
        .is("cancelled_at", null)
        .order("reservation_datetime", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !earliest) return true;
      if (earliest.id === targetId) return true;

      const t = new Date(targetISO).getTime();
      const e = new Date(earliest.reservation_datetime as string).getTime();
      const diffMin = (t - e) / (60 * 1000);
      if (diffMin <= ALLOW_DIFF_MIN) return true;

      showError("กรุณายืนยันคิวก่อนหน้าก่อน");
      return false;
    } catch {
      return true;
    }
  }

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
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                <FontAwesomeIcon icon={faInfo} />
                รายละเอียดคิว
              </div>
              <h3 className="mt-2 text-lg font-semibold">
                {fallbackName(row) ?? "—"}
              </h3>
              <div className="mt-1 text-xs opacity-90">
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
            {/* Success banner */}
            {ok && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-700">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className="text-emerald-600"
                />
                <span>{ok}</span>
              </div>
            )}

            {/* Notice banner */}
            {notice && (
              <div
                role="alert"
                aria-live="polite"
                className={[
                  "mb-4 rounded-xl px-4 py-2 text-sm",
                  notice.type === "error"
                    ? "border border-rose-300 bg-rose-50 text-rose-700"
                    : notice.type === "success"
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border border-indigo-200 bg-indigo-50 text-indigo-800",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <span>{notice.text}</span>
                  <button
                    onClick={clearNotice}
                    className="text-xs opacity-70 hover:opacity-100"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}

            {/* INFO GRID */}
            <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">วันเวลา</p>
                <p className="mt-0.5 font-medium">
                  {formatDate(displayDatetime)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">จำนวนที่นั่ง</p>
                <p className="mt-0.5 font-medium">
                  {typeof displayPartysize === "number"
                    ? displayPartysize
                    : displayPartysize ?? "—"}{" "}
                  คน
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">สถานะ</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                      normStatus
                    )}`}
                  >
                    {displayStatus || "—"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">โต๊ะที่ใช้บริการ</p>
                <div className="mt-1 flex flex-wrap items-center gap-1 max-h-[72px] overflow-auto pr-1">
                  {assigned?.length > 0 ? (
                    assigned.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                        title={t.name}
                      >
                        โต๊ะ: {t.no ?? t.name}
                      </span>
                    ))
                  ) : shownTableNo ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                      โต๊ะ: {shownTableNo}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">ยังไม่มีโต๊ะ</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs text-gray-500">ข้อมูลเพิ่มเติม</p>
                <p className="mt-0.5 whitespace-pre-wrap">
                  {typeof displayComment === "string" && displayComment.trim()
                    ? displayComment
                    : "ไม่มีข้อมูลเพิ่มเติม"}
                </p>
              </div>
            </section>

            {/* PAID SUMMARY + TABLE */}
            <PaidSummary
              payment={payment}
              isPaid={isPaid}
              showPkg={showPkg}
              setShowPkg={setShowPkg}
            />

            {/* Cancel info */}
            <CancelInfo
              visible={normStatus.includes("cancel")}
              autoId="00000000-0000-0000-0000-000000000001"
              cancelledByUserId={cancelledByUserId}
              cancelledBy={cancelledBy}
              cancelledReason={cancelledReason}
              cancelledAt={cancelledAt}
              rowCancelledByRole={(row as any).cancelled_by?.role ?? null}
              rowCancelledByName={(row as any).cancelled_by?.name ?? null}
            />

            {/* EDIT step */}
            {!readOnly && editStep === 1 && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-amber-900">
                    แก้ไขรายละเอียดคิว
                  </div>
                  <div className="text-[11px] text-amber-700">
                    <span className="text-[11px] text-red-600">
                      *สามารถแก้ไขได้เมื่อลูกค้าบอกเท่านั้น
                    </span>
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
                      min={(() => {
                        const now = new Date();
                        const in15 = new Date(now.getTime() + 15 * 60 * 1000);
                        const { H: oH, M: oM } = parseHHMM(
                          appSettings?.open_time ?? "09:00"
                        );
                        const { H: cH, M: cM } = parseHHMM(
                          appSettings?.close_time ?? "21:00"
                        );
                        const todayOpen = new Date();
                        todayOpen.setHours(oH, oM, 0, 0);
                        const todayClose = new Date();
                        todayClose.setHours(cH, cM, 0, 0);
                        let candidate = in15 < todayOpen ? todayOpen : in15;
                        if (candidate > todayClose) {
                          const nextOpen = new Date(todayOpen);
                          nextOpen.setDate(nextOpen.getDate() + 1);
                          candidate = nextOpen;
                        }
                        return toInputLocal(candidate);
                      })()}
                      max={(() => {
                        const daysAhead = Number(appSettings?.days_ahead ?? 30);
                        const { H: cH, M: cM } = parseHHMM(
                          appSettings?.close_time ?? "23:59"
                        );
                        const d = new Date();
                        d.setDate(d.getDate() + daysAhead);
                        d.setHours(cH, cM, 0, 0);
                        return toInputLocal(d);
                      })()}
                      step={60 * 5}
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

                  <div className="rounded-xl border bg-white px-3 py-3 sm:col-span-2">
                    <label className="mb-1 block text-xs text-gray-600">
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

            {/* PICK TABLE step (หลายโต๊ะ) */}
            {!readOnly && tableStep === 1 && (
              <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-indigo-800">
                    เลือกโต๊ะ
                  </div>
                </div>

                <TablePicker
                  tableNos={tableNos}
                  tableCaps={tableCaps}
                  picked={picked}
                  setPicked={(updater) => setPicked((prev) => updater(prev))}
                  around={around}
                  myAssignedNos={myAssignedNos}
                  row={row}
                  requiredSeats={requiredSeats}
                />

                {/* Summary */}
                <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-indigo-100">
                  ความจุของโต๊ะที่รับได้: <b>{allowedSum}</b> คน • จำนวนคนที่จอง{" "}
                  <b>{requiredSeats}</b> คน
                  {need > 0 ? (
                    <span className="text-rose-600">
                      {" "}
                      • จำนวนที่นั่งยังขาดอีก {need} ที่นั่ง
                    </span>
                  ) : (
                    <span className="text-emerald-600">
                      {" "}
                      • เพียงพอต่อจำนวนคน
                    </span>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTableStep(0)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
                    disabled={busy}
                  >
                    กลับ
                  </button>
                  <button
                    type="button"
                    disabled={!canSave || busy}
                    onClick={async () => {
                      try {
                        setBusy(true);
                        const res = await fetch(
                          `/api/admin/reservations/${row.id}/assign-tables`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              tableNos: picked,
                              partySize: Number(displayPartysize) || 0,
                            }),
                          }
                        );
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          throw new Error(err?.error || "จัดโต๊ะไม่สำเร็จ");
                        }
                        setLocalStatus("seated");
                        setOptimisticTableNo(null);
                        setTableStep(0);
                        await loadAssignedTables();
                        onUpdated?.();
                      } catch (e: any) {
                        showError(e?.message || "จัดโต๊ะไม่สำเร็จ");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    บันทึกโต๊ะที่เลือก
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
                          const okToConfirm = await canConfirmThisReservation(
                            row.id,
                            row.reservation_datetime ?? null
                          );
                          if (!okToConfirm) return;
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
                  {normStatus.includes("paid") && (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      ชำระเงินแล้ว
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

        {/* Payment Drawer */}
        <PaymentStep
          open={showPayment}
          onClose={() => setShowPayment(false)}
          reservationId={row.id}
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
            try {
              setBusy(true);
              const res = await fetch("/api/admin/bills/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reservationId: row.id,
                  paymentMethod: payload?.paymentMethod,
                  selectedPackage: payload?.selectedPackage ?? null,
                  people: payload?.people ?? 1,
                  children: payload?.children ?? 0,
                  childUnit: payload?.childUnit ?? 0,
                  alaItems: payload?.alaItems ?? [],
                }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || "บันทึกบิลไม่สำเร็จ");
              }
              setShowPayment(false);
              setOk("บันทึกการชำระเงินสำเร็จ");
              await refreshRow();
              await loadPaymentInfo(row.id);
              onUpdated?.();
              setTimeout(() => setOk(null), 1600);
            } catch (e: any) {
              showError(
                "บันทึกการชำระเงินล้มเหลว: " + (e?.message || "Unknown error")
              );
            } finally {
              setBusy(false);
            }
          }}
        />

        {/* Confirm Delete Modal */}
        <ConfirmDeleteModal
          open={confirmDelOpen}
          row={row}
          delBusy={delBusy}
          delErr={delErr}
          onClose={() => setConfirmDelOpen(false)}
          onConfirm={handleDeleteReservation}
        />
      </div>
    </div>
  );
}

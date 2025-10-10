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
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabaseClient";
import type { OccupiedItem, Props } from "@/types/reservationdetail";
import PaymentStep from "@/components/admin/PaymentStep";
import {
  statusClass,
  normalizePaymentMethod,
  paymentMethodLabel,
} from "@/utils/status";

const TH_TZ = "Asia/Bangkok";

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
    setLocalStatus((data?.status ?? "").toLowerCase());
    setDisplayDatetime(data?.reservation_datetime ?? null);
    setDisplayPartysize(data?.partysize ?? null);
    setDisplayComment(data?.comment ?? null);
    await loadAssignedTables(); // ⬅️ รีเฟรชรายชื่อโต๊ะที่นั่งอยู่
  }

  // ⬇️ โหลดรายการโต๊ะที่ mapping กับ reservation นี้ทั้งหมด
  const [assignedTables, setAssignedTables] = useState<
    { id: string; name: string; no: number | null }[]
  >([]);
  const getNo = (name?: string | null) => {
    const m = String(name ?? "").match(/\d+/);
    return m ? Number(m[0]) : null;
  };
  async function loadAssignedTables() {
    if (!row?.id) return;
    const { data, error } = await supabase
      .from("reservation_tables")
      .select("table_id, tables:table_id(id, table_name)")
      .eq("reservation_id", row.id);

    if (!error) {
      const items = (data ?? [])
        .map((r: any) => r.tables)
        .filter(Boolean)
        .map((t: any) => ({
          id: t.id as string,
          name: String(t.table_name ?? ""),
          no: getNo(t.table_name),
        }));
      // เรียงตามหมายเลขโต๊ะ
      items.sort((a: { no: any }, b: { no: any }) => (a.no ?? 0) - (b.no ?? 0));
      setAssignedTables(items);
    } else {
      setAssignedTables([]);
    }
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

  const [localStatus, setLocalStatus] = useState<string>(
    (row?.status ?? "").toLowerCase()
  );
  const [busy, setBusy] = useState(false);

  const displayStatus = localStatus || row?.status || "—";
  const normStatus = useMemo(
    () => (displayStatus || "").toLowerCase(),
    [displayStatus]
  );
  const isPaid = normStatus === "paid";

  // steps
  const [cancelStep, setCancelStep] = useState<0 | 1>(0);
  const [tableStep, setTableStep] = useState<0 | 1>(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [editStep, setEditStep] = useState<0 | 1>(0);

  // edit form
  const [editDate, setEditDate] = useState<string>("");
  const [editSize, setEditSize] = useState<string>("");
  const [editComment, setEditComment] = useState<string>("");

  // cancel reason
  const [reason, setReason] = useState("");
  const minReasonLen = 3;

  // Payment Drawer
  const [showPayment, setShowPayment] = useState(false);

  // (ยังคงสำหรับโค้ดเดิมที่ใช้เลขโต๊ะเดียวในบางที่)
  const [optimisticTableNo, setOptimisticTableNo] = useState<number | null>(
    currentTableNo ?? null
  );

  // table cap
  const [tableCaps, setTableCaps] = useState<Map<number, number>>(new Map());
  const capacityInfo = (no: number) => {
    const cap = tableCaps.get(no) ?? null;
    const allowed = cap != null ? cap + 2 : null;
    const size = Number(displayPartysize) || 0;
    const over = allowed != null && size > allowed;
    return { cap, allowed, size, over };
  };

  const allowedSum = useMemo(() => {
    return picked.reduce((sum, no) => {
      const cap = tableCaps.get(no) ?? 0;
      return sum + (cap + 2);
    }, 0);
  }, [picked, tableCaps]);

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

  const [confirmDelOpen, setConfirmDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  const [notice, setNotice] = useState<null | {
    type: "success" | "error" | "info";
    text: string;
  }>(null);
  const showError = (text: string) => setNotice({ type: "error", text });
  const clearNotice = () => setNotice(null);

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
  const requiredSeats = Number(displayPartysize ?? 0) || 0;
  const need = Math.max(0, requiredSeats - allowedSum);
  const canSave = picked.length > 0 && need === 0;

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
  const [around, setAround] = useState<OccupiedItem[]>([]);
  const [tableNos, setTableNos] = useState<number[]>([]);
  const occByTable = useMemo(() => {
    const m = new Map<number, OccupiedItem>();
    (around ?? []).forEach((o) => m.set(o.tableNo, o));
    return m;
  }, [around]);
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
  const myAssignedNos = useMemo(
    () =>
      (assignedTables ?? [])
        .map((t) => t.no)
        .filter((n): n is number => n != null),
    [assignedTables]
  );
  const [isAdmin, setIsAdmin] = useState(false);

  // โหลดรายการโต๊ะที่ชนเวลา (รอบ ๆ วัน/เวลาเดียวกัน) เพื่อ disable ปุ่ม
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
    if (tableStep === 1) setNotice(null);
  }, [tableStep]);

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
    setOptimisticTableNo(currentTableNo ?? null);
    loadAssignedTables(); // ⬅️ โหลดโต๊ะที่นั่งอยู่เมื่อเปิด/เปลี่ยนเรคคอร์ด
  }, [row?.id, open, currentTableNo]);

  // ดึงบิลเฉพาะตอน paid
  useEffect(() => {
    if (open && row?.id && isPaid) {
      loadPaymentInfo(row.id);
    }
  }, [open, row?.id, isPaid]);

  // ปิด toggle รายละเอียดเมื่อไม่ใช่ paid
  useEffect(() => {
    if (!isPaid) setShowPkg(false);
  }, [isPaid]);

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

    // ไม่เช็ค time-conflict ใน client อีกต่อไป — ใช้ผล occupied จาก API เท่านั้น
    const occ = occByTable.get(no);
    if (occ && !myAssignedNos.includes(no)) {
      // คนอื่นจับอยู่ — กันไว้เฉย ๆ (ปกติปุ่มจะ disabled อยู่แล้ว)
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
      await loadAssignedTables(); // เผื่อแก้เวลาแล้วมีผลกับแสดงผล
      onUpdated?.();

      setTimeout(() => setOk(null), 1600);
    } finally {
      setBusy(false);
    }
  };

  const alaQty = (payment?.alaItems ?? []).reduce(
    (s, it) => s + (it.qty ?? 0),
    0
  );
  const hasAnyBillItems =
    !!payment &&
    ((payment.packageQty ?? 0) > 0 || (payment.alaItems?.length ?? 0) > 0);
  const AUTO_CANCEL_UUID = "00000000-0000-0000-0000-000000000001";

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

      if (error) return true;
      if (!earliest) return true;

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
                  {assignedTables?.length > 0 ? (
                    assignedTables.map((t: any) => (
                      <span
                        key={t.id ?? t.table_id}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                        title={t.name ?? t.table_name ?? undefined}
                      >
                        โต๊ะ: {t.no ?? t.tables?.no ?? t.name ?? t.table_name}
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

            {/* PAID SUMMARY CARDS */}
            {isPaid && payment && (
              <section className="mt-4 mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-emerald-700">ช่องทางการชำระเงิน</p>
                  <p className="mt-0.5 font-semibold text-emerald-900">
                    {(() => {
                      const pmKey = normalizePaymentMethod(
                        payment?.method ?? ""
                      );
                      return (
                        <span className="mt-1 font-medium text-emerald-900">
                          {paymentMethodLabel(pmKey)}
                        </span>
                      );
                    })()}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-emerald-700">
                      แพ็กเกจทั้งหมด
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPkg((v) => !v)}
                      className="text-[11px] font-medium text-emerald-700 hover:underline"
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

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-emerald-700">ราคารวม</p>
                  <p className="mt-0.5 text-lg font-bold text-emerald-900">
                    {formatTHB(payment?.total)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-emerald-700">เวลาชำระเงิน</p>
                  <p className="mt-0.5 font-semibold text-emerald-900">
                    {formatDisplayDate(payment?.paidAt ?? null)}
                  </p>
                </div>
              </section>
            )}

            {/* TABLE DETAIL (toggle) */}
            {isPaid && payment && showPkg && (
              <div className="mt-5 md:mt-6 overflow-x-auto">
                <table className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl text-sm">
                  <thead>
                    <tr className="bg-emerald-100/70 text-sm text-emerald-900">
                      <th className="w-[45%] rounded-tl-xl px-4 py-2 text-left font-semibold">
                        แพ็กเกจ
                      </th>
                      <th className="w-[20%] px-4 py-2 text-right font-semibold">
                        ราคา/หน่วย
                      </th>
                      <th className="w-[15%] px-4 py-2 text-center font-semibold">
                        จำนวน
                      </th>
                      <th className="w-[20%] rounded-tr-xl px-4 py-2 text-right font-semibold">
                        รวม
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-sm">
                    {payment.packages.map((p, i) => (
                      <tr
                        key={`pkg-${i}`}
                        className={i % 2 ? "bg-white" : "bg-emerald-50/30"}
                      >
                        <td className="px-4 py-2">{p.name}</td>
                        <td className="px-4 py-2 text-right">
                          {formatTHB(p.unitPrice)}
                        </td>
                        <td className="px-4 py-2 text-center">{p.qty}</td>
                        <td className="px-4 py-2 text-right">
                          {formatTHB(p.unitPrice * p.qty)}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-white">
                      <td
                        className="px-4 py-2 text-right text-gray-600"
                        colSpan={3}
                      >
                        รวมแพ็กเกจ
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatTHB(payment?.pkgSubtotal ?? 0)}
                      </td>
                    </tr>

                    {Boolean(payment?.alaItems?.length) && (
                      <>
                        <tr>
                          <td
                            className="px-4 pt-4 text-sm font-semibold text-emerald-900"
                            colSpan={4}
                          >
                            เมนูเพิ่ม
                          </td>
                        </tr>

                        {payment.alaItems.map((p, i) => (
                          <tr
                            key={`ala-${i}`}
                            className={i % 2 ? "bg-white" : "bg-emerald-50/30"}
                          >
                            <td className="px-4 py-2">{p.name}</td>
                            <td className="px-4 py-2 text-right">
                              {formatTHB(p.unitPrice)}
                            </td>
                            <td className="px-4 py-2 text-center">{p.qty}</td>
                            <td className="px-4 py-2 text-right">
                              {formatTHB(p.unitPrice * p.qty)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-white">
                          <td
                            className="px-4 py-2 text-right text-gray-600"
                            colSpan={3}
                          >
                            รวมเมนูเพิ่ม
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatTHB(payment?.alaSubtotal ?? 0)}
                          </td>
                        </tr>
                      </>
                    )}

                    <tr className="bg-emerald-600 text-white">
                      <td
                        className="rounded-bl-xl px-4 py-2 text-right font-semibold"
                        colSpan={3}
                      >
                        รวมทั้งสิ้น
                      </td>
                      <td className="rounded-br-xl px-4 py-2 text-right text-base font-bold">
                        {formatTHB(
                          (payment?.pkgSubtotal ?? 0) +
                            (payment?.alaSubtotal ?? 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Cancel info */}
            {normStatus.includes("cancel") && (
              <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900">
                <div className="mb-3 text-sm font-semibold">
                  ข้อมูลการยกเลิก
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-red-700">บทบาทผู้ยกเลิก:</span>{" "}
                    <span className="font-medium">
                      {row.cancelled_by_user_id ===
                      "00000000-0000-0000-0000-000000000001"
                        ? "ระบบอัตโนมัติ"
                        : (row as any).cancelled_by?.role
                        ? (row as any).cancelled_by.role
                        : "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-red-700">ชื่อผู้ยกเลิก:</span>{" "}
                    <span className="font-medium">
                      {row.cancelled_by_user_id ===
                      "00000000-0000-0000-0000-000000000001"
                        ? "ระบบอัตโนมัติ"
                        : (row as any).cancelled_by?.name?.trim() || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-red-700">สาเหตุ:</span>{" "}
                    <span className="break-words whitespace-pre-line font-medium">
                      {row.cancelled_reason?.trim() || "—"}
                    </span>
                  </div>

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

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {tableNos.map((no) => {
                    const occ = occByTable.get(no);
                    const cap = tableCaps.get(no) ?? null;
                    const allowed = cap != null ? cap + 2 : null;

                    const isMine =
                      !!occ &&
                      ((occ as any)?.reservationId === row.id ||
                        (occ as any)?.queue_code === row.queue_code);

                    const isOthers = !!occ && !isMine;
                    const isPicked = picked.includes(no);
                    const baseClass =
                      "rounded-xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2";
                    const stateClass = isOthers
                      ? "border-rose-300 bg-rose-50 text-rose-700 opacity-60 cursor-not-allowed"
                      : isPicked
                      ? // สีน้ำเงินเมื่อเลือก
                        "border-indigo-500 bg-indigo-50 text-indigo-700 ring-indigo-200"
                      : myAssignedNos.includes(no)
                      ? // โต๊ะปัจจุบัน
                        "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : // ปกติ/ว่าง
                        "border-slate-200 bg-white hover:bg-slate-50";

                    return (
                      <button
                        key={no}
                        onClick={() =>
                          setPicked((arr) =>
                            arr.includes(no)
                              ? arr.filter((x) => x !== no)
                              : [...arr, no]
                          )
                        }
                        disabled={busy || isOthers}
                        className={[baseClass, stateClass].join(" ")}
                        title={
                          myAssignedNos.includes(no)
                            ? `โต๊ะปัจจุบัน ${row.queue_code ?? ""}`
                            : isOthers
                            ? `โต๊ะของ ${showOccCode(occ)}`
                            : isPicked
                            ? "กำลังเลือก"
                            : "ว่าง"
                        }
                        aria-pressed={isPicked} // ช่วยเรื่อง a11y
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">โต๊ะ {no}</div>
                          {isPicked && (
                            <span className="text-[10px] font-medium text-indigo-700">
                              เลือกแล้ว
                            </span>
                          )}
                        </div>
                        <div className="text-[11px]">
                          {myAssignedNos.includes(no)
                            ? `โต๊ะปัจจุบัน ${row.queue_code ?? ""}`
                            : isOthers
                            ? `โต๊ะของ ${showOccCode(occ)}`
                            : isPicked
                            ? "กำลังเลือก"
                            : "ว่าง"}
                        </div>
                        {cap != null && (
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            ความจุ {cap} • (สูงสุด {allowed})
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

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
                        // success
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

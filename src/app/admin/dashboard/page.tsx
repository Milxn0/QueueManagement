/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import type { OccupiedItem } from "@/components/ReservationDetailModal";
import TodayQueueTable from "@/components/admin/TodayQueueTable";

type ReservationRow = {
  id: string;
  user_id: string | null;
  reservation_datetime: string | null;
  partysize: number | string | null;
  queue_code: string | null;
  status: string | null;
  created_at: string | null;
  table_id: string | null;
  user?: {
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  cancelled_by?: { name: string | null; role?: string | null } | null;
  tbl?: { table_name: string | null } | null;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function TodayQueuePage() {
  const supabase = useMemo(() => createClient(), []);

  // ---------- Auth gate ----------
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsLoggedIn(!!data.user);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: any, s: { user: any }) => setIsLoggedIn(!!s?.user)
    );
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ---------- Date helpers ----------
  const startEndToday = useCallback(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const startOfDay = new Date(y, m, now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(y, m, now.getDate(), 23, 59, 59, 999);
    const iso = (d: Date) => d.toISOString();
    return {
      startOfDayISO: iso(startOfDay),
      endOfDayISO: iso(endOfDay),
    };
  }, []);

  // ---------- Reservations (วันนี้เท่านั้น) ----------
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    setRowsLoading(true);
    const res = await fetch("/api/admin/reservations/today", {
      cache: "no-store",
    });
    const data = await res.json();
    setRows(data);
    setRowsLoading(false);
  }, []);

  // ---------- Realtime ----------
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      fetchReservations();
    }, 250);
  }, [fetchReservations]);

  useEffect(() => {
    fetchReservations();
    const ch = supabase
      .channel("reservations-today")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reservations" },
        scheduleRefetch
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservations" },
        scheduleRefetch
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reservations" },
        scheduleRefetch
      )
      .subscribe();
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmReservation = useCallback(
    async (id: string) => {
      await fetch(`/api/admin/reservations/${id}/confirm`, { method: "PATCH" });
      scheduleRefetch();
    },
    [scheduleRefetch]
  );

  // ---------- helpers ----------
  const parseTableNo = (name?: string | null) => {
    if (!name) return null;
    const m = name.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  };
  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? "-"
      : d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  };

  // ---------- เลือก/ย้ายโต๊ะ ----------
  const findTableIdByNo = async (no: number) => {
    const { data, error } = await supabase
      .from("tables")
      .select("id, table_name")
      .eq("table_name", `โต๊ะ ${no}`)
      .limit(1)
      .single();
    if (error || !data?.id) throw new Error(`ไม่พบโต๊ะหมายเลข ${no}`);
    return data.id as string;
  };

  const handleAssignTable = async (reservationId: string, tableNo: number) => {
    const tableId = await findTableIdByNo(tableNo);
    const { error } = await supabase
      .from("reservations")
      .update({ table_id: tableId, status: "seated" })
      .eq("id", reservationId);
    if (error) throw error;

    setDetailRow((prev) =>
      prev && prev.id === reservationId
        ? {
            ...prev,
            status: "seated",
            table_id: tableId,
            tbl: { table_name: `โต๊ะ ${tableNo}` },
          }
        : prev
    );
    scheduleRefetch();
  };

  const handleMoveTable = async (
    reservationId: string,
    _fromNo: number,
    toNo: number
  ) => {
    const tableId = await findTableIdByNo(toNo);
    const { error } = await supabase
      .from("reservations")
      .update({ table_id: tableId })
      .eq("id", reservationId);
    if (error) throw error;
    scheduleRefetch();
  };

  // ---------- state สำหรับโมดัล ----------
  const [detailRow, setDetailRow] = useState<ReservationRow | null>(null);
  const [occupied, setOccupied] = useState<OccupiedItem[]>([]);
  const [currentTableNo, setCurrentTableNo] = useState<number | null>(null);

  const openDetail = useCallback(async (r: ReservationRow) => {
    setDetailRow(r);
    setCurrentTableNo(parseTableNo(r.tbl?.table_name ?? null));

    const params = new URLSearchParams({ dt: r.reservation_datetime ?? "" });
    const res = await fetch(
      `/api/admin/reservations/${r.id}/occupied?` + params.toString()
    );
    const list = await res.json();

    const occ = (list ?? [])
      .map(
        (o: {
          tbl?: { table_name?: string | null };
          reservation_datetime?: string;
          queue_code?: string;
        }) => ({
          tableNo: parseTableNo(o.tbl?.table_name ?? null) ?? 0,
          start: o.reservation_datetime,
          code: o.queue_code,
        })
      )
      .filter((o: { tableNo: number }) => o.tableNo > 0);

    setOccupied(occ);
  }, []);

  // ---------- UI ----------
  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-800">
            กรุณาเข้าสู่ระบบก่อน
          </h1>
          <p className="text-sm text-amber-800/80 mt-1">
            ต้องเข้าสู่ระบบเพื่อดูข้อมูลการจัดการคิว
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/auth/login"
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/auth/register"
              className="rounded-xl border border-indigo-300 px-4 py-2 hover:bg-indigo-50"
            >
              สมัครสมาชิก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 bg-gray-50 flex items-start justify-center">
      <main className="max-w-6xl w-full">
        <section className="mb-8">
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
            <div className="p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                Today-Queue-Management
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                คิววันนี้
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                ยืนยันและแก้ไขคิววันนี้
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-xl border">
          <div className="p-4 flex flex-wrap items-center gap-2 border-b">
            <div className="ml-auto text-sm text-gray-500">
              แสดง {rows.length} รายการ (วันนี้)
            </div>
          </div>

          <div className="overflow-x-auto ">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">คิว</th>
                  <th className="px-4 py-3 text-left">วัน-เวลา</th>
                  <th className="px-4 py-3 text-left">ลูกค้า</th>
                  <th className="px-4 py-3 text-left">จำนวน</th>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-left">การจัดการ</th>
                </tr>
              </thead>

              <TodayQueueTable
                rows={rows}
                onOpenDetail={openDetail}
                onConfirm={confirmReservation}
                rowsLoading={rowsLoading}
              />
            </table>
          </div>
        </section>

        <ReservationDetailModal
          open={!!detailRow}
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onConfirm={confirmReservation}
          onCancel={async (id, reason) => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            await supabase
              .from("reservations")
              .update({
                status: "cancelled",
                cancelled_reason: reason,
                cancelled_by_user_id: user?.id ?? null,
                cancelled_at: new Date().toISOString(),
              })
              .eq("id", id);
            scheduleRefetch();
          }}
          currentTableNo={currentTableNo}
          onAssignTable={handleAssignTable}
          onMoveTable={handleMoveTable}
          occupied={occupied}
        />
      </main>
    </div>
  );
}

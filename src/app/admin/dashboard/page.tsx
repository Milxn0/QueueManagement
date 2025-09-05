/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import type { OccupiedItem } from "@/components/ReservationDetailModal";
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
    const { startOfDayISO, endOfDayISO } = startEndToday();

    const { data, error } = await supabase
      .from("reservations")
      .select(
        `
        id, user_id, reservation_datetime, partysize, queue_code, status, created_at, table_id,
        user:users!reservations_user_id_fkey(name, phone, email),
        cancelled_at, cancelled_reason,
        cancelled_by:users!reservations_cancelled_by_user_id_fkey(name, role),
        tbl:tables!reservations_table_id_fkey(table_name)
      `
      )
      .gte("reservation_datetime", startOfDayISO)
      .lte("reservation_datetime", endOfDayISO)
      .order("reservation_datetime", { ascending: false })
      .limit(200);

    setRows(error ? [] : ((data ?? []) as ReservationRow[]));
    setRowsLoading(false);
  }, [startEndToday, supabase]);

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
      const { error } = await supabase
        .from("reservations")
        .update({ status: "confirmed" })
        .eq("id", id);
      if (error) {
        console.error("Update status failed:", error);
        return;
      }
      scheduleRefetch();
    },
    [supabase, scheduleRefetch]
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
  const statusClass = (s: string | null) => {
    const v = (s ?? "").toLowerCase();
    if (v.includes("cancel")) return "bg-red-100 text-red-700";
    if (v === "pending") return "bg-yellow-100 text-yellow-700";
    if (v === "confirm" || v === "confirmed")
      return "bg-indigo-100 text-indigo-700";
    if (v === "seated") return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-700";
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

  const openDetail = useCallback(
    async (r: ReservationRow) => {
      setDetailRow(r);
      setCurrentTableNo(parseTableNo(r.tbl?.table_name ?? null));

      if (!r.reservation_datetime) {
        setOccupied([]);
        return;
      }
      const base = new Date(r.reservation_datetime).getTime();
      const start = new Date(base - TWO_HOURS_MS).toISOString();
      const end = new Date(base + TWO_HOURS_MS).toISOString();

      const { data, error } = await supabase
        .from("reservations")
        .select(
          `id, queue_code, reservation_datetime, tbl:tables!reservations_table_id_fkey(table_name)`
        )
        .not("table_id", "is", null)
        .neq("id", r.id)
        .gte("reservation_datetime", start)
        .lte("reservation_datetime", end);

      if (error) {
        console.error(error);
        setOccupied([]);
        return;
      }

      const occ: OccupiedItem[] =
        (data ?? [])
          .map((x: any) => ({
            tableNo: parseTableNo(x?.tbl?.table_name ?? null) ?? -1,
            reservationId: x.id as string,
            queue_code: x.queue_code as string | null,
            reservation_datetime: x.reservation_datetime as string,
          }))
          .filter((o: { tableNo: number }) => o.tableNo > 0) || [];

      setOccupied(occ);
    },
    [supabase]
  );

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

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 border-b">
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    คิว/โค้ด
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    ผู้จอง
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    วันที่-เวลา
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    จำนวนที่นั่ง
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    สถานะ
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {rowsLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-20 bg-gray-200 animate-pulse rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-36 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      วันนี้ยังไม่มีรายการจองคิว
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const size =
                      typeof r.partysize === "string"
                        ? r.partysize
                        : typeof r.partysize === "number"
                        ? r.partysize.toString()
                        : "-";
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {r.queue_code ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {r.user?.name
                            ? (r.user?.name as string).slice(0, 8)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatDate(r.reservation_datetime)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{size}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(
                              r.status
                            )}`}
                          >
                            {r.status ?? "-"}
                          </span>
                          {r.tbl?.table_name && (
                            <span className="ml-2 text-xs text-slate-500">
                              ({r.tbl.table_name})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openDetail(r)}
                            className="inline-flex items-center rounded-xl bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-900"
                          >
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

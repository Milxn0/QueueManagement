/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCircleCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons"; // เปลี่ยนชื่อไอคอนตามที่ใช้จริง'
import ReservationDetailModal from "@/components/ReservationDetailModal";

type Stat = { label: string; value: number; color: string; text: string };

type FilterKey = "all" | "today" | "month" | "year" | "cancelled" | "blacklist";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "คิวทั้งหมด" },
  { key: "today", label: "คิววันนี้" },
  { key: "month", label: "คิวเดือนนี้" },
  { key: "year", label: "คิวปีนี้" },
  { key: "cancelled", label: "คิวที่ยกเลิก" },
];

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

  // ------- เพิ่มเฉพาะฟิลด์ที่ใช้แสดงผู้ยกเลิก -------
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  cancelled_by?: {
    name: string | null;
    role?: string | null;
  } | null;
};

export default function DashboardPage() {
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

  // ---------- Stats (นับจากตาราง reservations โดยตรง) ----------
  const [stats, setStats] = useState<Stat[]>([
    {
      label: "จำนวนคิววันนี้",
      value: 0,
      color: "bg-blue-100",
      text: "text-blue-700",
    },
    {
      label: "จำนวนคิวเดือนนี้",
      value: 0,
      color: "bg-green-100",
      text: "text-green-700",
    },
    {
      label: "คิวไม่มาวันนี้ (cancelled)",
      value: 0,
      color: "bg-yellow-100",
      text: "text-yellow-700",
    },
  ]);

  const startEnd = useCallback(() => {
    // ใช้โซนเวลาบนเครื่องผู้ใช้ (ตรงกับภาพและ scenario ไทย)
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const startOfDay = new Date(y, m, now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(y, m, now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(y, m, 1, 0, 0, 0, 0);
    const startOfYear = new Date(y, 0, 1, 0, 0, 0, 0);

    const iso = (d: Date) => d.toISOString();
    return {
      startOfDayISO: iso(startOfDay),
      endOfDayISO: iso(endOfDay),
      startOfMonthISO: iso(startOfMonth),
      startOfYearISO: iso(startOfYear),
    };
  }, []);

  const fetchStats = useCallback(async () => {
    const { startOfDayISO, endOfDayISO, startOfMonthISO } = startEnd();

    // 1) today
    const todayQ = supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .gte("reservation_datetime", startOfDayISO)
      .lte("reservation_datetime", endOfDayISO);

    // 2) month
    const monthQ = supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .gte("reservation_datetime", startOfMonthISO);

    // 3) cancelled today
    const cancelledTodayQ = supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .gte("reservation_datetime", startOfDayISO)
      .lte("reservation_datetime", endOfDayISO)
      .ilike("status", "%cancel%");

    const [t, m, c] = await Promise.all([todayQ, monthQ, cancelledTodayQ]);

    setStats([
      {
        label: "จำนวนคิววันนี้",
        value: t.count ?? 0,
        color: "bg-blue-100",
        text: "text-blue-700",
      },
      {
        label: "จำนวนคิวเดือนนี้",
        value: m.count ?? 0,
        color: "bg-green-100",
        text: "text-green-700",
      },
      {
        label: "คิวไม่มาวันนี้ (cancelled)",
        value: c.count ?? 0,
        color: "bg-yellow-100",
        text: "text-yellow-700",
      },
    ]);
  }, [startEnd, supabase]);

  // ---------- Reservations table (ดึงจาก DB + กรองที่ DB) ----------
  const [filter, setFilter] = useState<FilterKey>("all");
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [detailRow, setDetailRow] = useState<ReservationRow | null>(null);

  const fetchReservations = useCallback(async () => {
    setRowsLoading(true);
    const { startOfDayISO, endOfDayISO, startOfMonthISO, startOfYearISO } =
      startEnd();

    let q = supabase
      .from("reservations")
      .select(
        `
  id, user_id, reservation_datetime, partysize, queue_code, status, created_at, table_id,
  user:users!reservations_user_id_fkey(name, phone, email),
  cancelled_at, cancelled_reason,
  cancelled_by:users!reservations_cancelled_by_user_id_fkey(name, role)
`
      )

      .order("reservation_datetime", { ascending: false })
      .limit(200);

    switch (filter) {
      case "today":
        q = q
          .gte("reservation_datetime", startOfDayISO)
          .lte("reservation_datetime", endOfDayISO);
        break;
      case "month":
        q = q.gte("reservation_datetime", startOfMonthISO);
        break;
      case "year":
        q = q.gte("reservation_datetime", startOfYearISO);
        break;
      case "cancelled":
        q = q.ilike("status", "%cancel%");
        break;
      case "all":
      default:
        // no extra filter
        break;
    }

    const { data, error } = await q;
    setRows(error ? [] : (data as ReservationRow[]));
    setRowsLoading(false);
  }, [filter, startEnd, supabase]);

  // ---------- Realtime ----------
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      fetchStats();
      fetchReservations();
    }, 250);
  }, [fetchStats, fetchReservations]);

  useEffect(() => {
    fetchStats();
    fetchReservations();
    const ch = supabase
      .channel("reservations-dashboard")
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
        .update({ status: "confirmed" }) // ใช้ "confirmed" ให้สอดคล้องกับที่ส่วนอื่นใช้อยู่
        .eq("id", id);

      if (error) {
        console.error("Update status failed:", error);
        return;
      }
      // ให้รีเฟรชข้อมูลสั้นๆ (มี realtime อยู่แล้ว แต่นี่ช่วยให้ไวขึ้น)
      scheduleRefetch();
    },
    [supabase, scheduleRefetch]
  );
  // เมื่อเปลี่ยนตัวกรอง → ดึงใหม่จาก DB
  useEffect(() => {
    fetchReservations();
  }, [filter, fetchReservations]);

  // ---------- helpers ----------
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
            ต้องเข้าสู่ระบบเพื่อดูข้อมูลสถิติของร้าน
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
        {/* สรุปสถิติ */}
        <section className="mb-8">
          <h1 className="text-2xl font-semibold mb-6 text-indigo-600">
            Dashboard
          </h1>
          {/* Toolbar: Export */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <a
              href="/api/export/reservations?range=today&include=pending,confirmed,seated,completed"
              className="inline-flex items-center rounded-lg border px-3 py-2 hover:bg-gray-50"
            >
              ดาวน์โหลด Excel — วันนี้
            </a>
            <a
              href="/api/export/reservations?range=month&include=pending,confirmed,seated,completed"
              className="inline-flex items-center rounded-lg border px-3 py-2 hover:bg-gray-50"
            >
              ดาวน์โหลด Excel — เดือนนี้
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className={`rounded-2xl shadow-lg p-8 flex flex-col items-center ${stat.color}`}
              >
                <div className={`text-4xl font-bold mb-2 ${stat.text}`}>
                  {stat.value}
                </div>
                <div className="text-lg font-medium text-gray-700">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ตารางคิว + ตัวกรอง */}
        <section className="bg-white rounded-2xl shadow-xl border">
          {/* Filter bar */}
          <div className="p-4 flex flex-wrap items-center gap-2 border-b">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-xl px-3 py-1.5 text-sm border transition ${
                  filter === f.key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="ml-auto text-sm text-gray-500">
              แสดง {rows.length} รายการ (ล่าสุด 200 แถว)
            </div>
          </div>

          {/* Table */}
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
                      ไม่พบข้อมูลในตัวกรองนี้
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
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setDetailRow(r)}
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
        />
      </main>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import ReservationDetailModal from "@/components/admin/ReservationDetailModal";
import ManageQueueTable from "@/components/admin/ManageQueueTable";
import { parseTableNo } from "@/utils/tables";
import { assignTable, moveTable } from "@/lib/reservations";
import type { ReservationRow } from "@/types/reservationrow";
import type { FilterKey } from "@/types/filters";
import { FILTERS } from "@/utils/filters";
import { OccupiedItem } from "@/types/reservationdetail";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons/faClockRotateLeft";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function ManageQueuesPage() {
  const supabase = useMemo(() => createClient(), []);
  type SortKey =
    | "time-desc"
    | "time-asc"
    | "code-asc"
    | "code-desc"
    | "name-asc"
    | "name-desc"
    | "seats-asc"
    | "seats-desc";
  const [sortBy, setSortBy] = useState<SortKey>("time-desc");

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

  // ---------- helpers ----------
  const startEnd = useCallback(() => {
    const now = new Date();
    const y = now.getFullYear();
    const startOfYear = new Date(y, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(y, 11, 31, 23, 59, 59, 999);
    const iso = (d: Date) => d.toISOString();
    return { startOfYearISO: iso(startOfYear), endOfYearISO: iso(endOfYear) };
  }, []);

  // เดือนที่เลือก (yyyy-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const monthRange = useCallback((ym: string) => {
    const [Y, M] = ym.split("-").map(Number);
    const start = new Date(Y, (M ?? 1) - 1, 1, 0, 0, 0, 0);
    const end = new Date(Y, M ?? 1, 0, 23, 59, 59, 999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, []);

  // ---------- Search ----------
  const [search, setSearch] = useState("");
  const norm = (v: unknown) => (v == null ? "" : String(v)).toLowerCase();

  // ---------- Reservations ----------
  const [filter, setFilter] = useState<FilterKey>("all");
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    setRowsLoading(true);

    // คำนวณช่วงเวลา/เงื่อนไขตาม filter
    let start = "";
    let end = "";
    const { startOfYearISO, endOfYearISO } = startEnd();

    if (filter === "month") {
      const { startISO, endISO } = monthRange(selectedMonth);
      start = startISO;
      end = endISO;
    } else if (
      filter === "year" ||
      filter === "all" ||
      filter === "cancelled"
    ) {
      start = startOfYearISO;
      end = endOfYearISO;
    }

    const qs = new URLSearchParams();
    if (start) qs.set("start", start);
    if (end) qs.set("end", end);
    if (filter === "cancelled") qs.set("status", "cancelled");

    const res = await fetch(`/api/admin/reservations?` + qs.toString(), {
      cache: "no-store",
    });
    const data = await res.json();

    setRows(data);
    setRowsLoading(false);
  }, [filter, selectedMonth, startEnd, monthRange]);

  // Derived rows after client-side search
  const displayRows = useMemo(() => {
    const term = norm(search);
    if (!term) return rows;
    return rows.filter((r) => {
      const values = [
        r.queue_code,
        r.users?.name,
        r.users?.phone,
        r.users?.email,
        r.status,
      ].map(norm);
      return values.some((v) => v.includes(term));
    });
  }, [rows, search]);

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
      .channel("reservations-manage")
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
  useEffect(() => {
    fetchReservations();
  }, [filter, selectedMonth, fetchReservations]);
  const confirmReservation = useCallback(
    async (id: string) => {
      await fetch(`/api/admin/reservations/${id}/confirm`, { method: "PATCH" });
      scheduleRefetch();
    },
    [scheduleRefetch]
  );

  const handleAssignTable = useCallback(
    async (reservationId: string, tableNo: number) => {
      await assignTable(reservationId, tableNo);
      scheduleRefetch();
    },
    [scheduleRefetch]
  );

  const handleMoveTable = useCallback(
    async (reservationId: string, _fromNo: number, toNo: number) => {
      await moveTable(reservationId, toNo);
      scheduleRefetch();
    },
    [scheduleRefetch]
  );

  // ---------- Modal state ----------
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
  const sortedRows = useMemo(() => {
    const rows = [...displayRows];

    const toTime = (iso?: string | null) => {
      const d = iso ? new Date(iso) : null;
      return d && !isNaN(d.getTime()) ? d.getTime() : 0;
    };
    const safeStr = (v: unknown) => String(v ?? "").toLowerCase();
    const safeNum = (v: unknown) => Number(v ?? 0);

    rows.sort((a: any, b: any) => {
      switch (sortBy) {
        case "time-asc":
          return (
            toTime(a.reservation_datetime) - toTime(b.reservation_datetime)
          );
        case "time-desc":
          return (
            toTime(b.reservation_datetime) - toTime(a.reservation_datetime)
          );
        case "code-asc":
          return safeStr(a.queue_code).localeCompare(safeStr(b.queue_code));
        case "code-desc":
          return safeStr(b.queue_code).localeCompare(safeStr(a.queue_code));
        case "name-asc":
          return safeStr(a.user?.name).localeCompare(safeStr(b.user?.name));
        case "name-desc":
          return safeStr(b.user?.name).localeCompare(safeStr(a.user?.name));
        case "seats-asc":
          return safeNum(a.partysize) - safeNum(b.partysize);
        case "seats-desc":
          return safeNum(b.partysize) - safeNum(a.partysize);
        default:
          return 0;
      }
    });

    return rows;
  }, [displayRows, sortBy]);
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
                <FontAwesomeIcon icon={faClockRotateLeft} />
                Queue-History
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                ประวัตการจองคิวทั้งหมด
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                ดูคิวทั้งหมด / เลือกเดือน / ปี
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-xl border">
          <div className="p-4 flex flex-wrap items-center gap-2 border-b">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key);
                  setSearch("");
                }}
                className={`rounded-xl px-3 py-1.5 text-sm border transition ${
                  filter === f.key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}

            {filter === "month" && (
              <div className="ml-2 flex items-center gap-2">
                <label className="text-sm text-gray-600">เดือน</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-xl border px-3 py-1.5 text-sm"
                />
              </div>
            )}

            <div className="w-full basis-full mt-2 flex items-center gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="rounded-xl border px-3 py-1.5 text-sm"
                >
                  <option value="time-desc">เวลา (ใหม่→เก่า)</option>
                  <option value="time-asc">เวลา (เก่า→ใหม่)</option>
                  <option value="code-asc">โค้ดคิว A→Z</option>
                  <option value="code-desc">โค้ดคิว Z→A</option>
                  <option value="name-asc">ชื่อ ก→ฮ</option>
                  <option value="name-desc">ชื่อ ฮ→ก</option>
                  <option value="seats-asc">ที่นั่ง น้อย→มาก</option>
                  <option value="seats-desc">ที่นั่ง มาก→น้อย</option>
                </select>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา: โค้ดคิว / ชื่อ / เบอร์ / อีเมล"
                className="flex-1 min-w-[220px] md:min-w-[320px] max-w-xl rounded-xl border px-3 py-1.5 text-sm"
              />
              <div className="text-sm text-gray-500">
                แสดง {displayRows.length} รายการ (ล่าสุด 200 แถว)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <ManageQueueTable
              displayRows={sortedRows}
              rowsLoading={rowsLoading}
              openDetail={(r) => {
                void openDetail(r as ReservationRow);
              }}
            />
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
          readOnly
          fromManageQueue
        />
      </main>
    </div>
  );
}

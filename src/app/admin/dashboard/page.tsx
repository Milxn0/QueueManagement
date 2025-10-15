/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import ReservationDetailModal from "@/components/admin/ReservationDetailModal";
import TodayQueueTable from "@/components/admin/TodayQueueTable";
import { parseTableNo } from "@/utils/tables";
import { assignTable, moveTable } from "@/lib/reservations";
import type { ReservationRow } from "@/types/reservationrow";
import { OccupiedItem } from "@/types/reservationdetail";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListCheck } from "@fortawesome/free-solid-svg-icons/faListCheck";
import StatusFilter from "@/components/admin/StatusFilter";
import type { StatusKey } from "@/types/filters";
import StatsGrid from "@/components/admin/dashboard/StatsGrid";
import type { Totals } from "@/types/queue-manage";
import { normalizeStatus } from "@/utils/status";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ---------- Reservations (วันนี้เท่านั้น) ----------
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [waitingAllRows, setWaitingAllRows] = useState<ReservationRow[]>([]);
  const sp = useSearchParams();

  const router = useRouter();
  const pathname = usePathname();
  const rawParam = sp?.get?.("status") ?? "";
  const statusParam = (sp?.get?.("status") as StatusKey | "") || "";
  const filteredRows =
    statusParam === "waiting"
      ? filterByStatus(waitingAllRows, "waiting")
      : filterByStatus(rows, statusParam);

  const fetchReservations = useCallback(async () => {
    setRowsLoading(true);
    try {
      const res = await fetch("/api/admin/reservations/today", {
        cache: "no-store",
      });

      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      const todayRows: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : [];

      setRows(todayRows);
      let waitingAll: any[] | null = null;
      try {
        const api = await fetch("/api/admin/reservations/waiting-all", {
          cache: "no-store",
          credentials: "include",
        });
        if (api.ok) {
          const body = await api.json();
          waitingAll = Array.isArray(body)
            ? body
            : Array.isArray(body?.data)
            ? body.data
            : [];
        } else {
          const errBody = await api.json().catch(() => ({}));
          console.error(
            "waiting-all API error",
            api.status,
            errBody?.error || errBody
          );
        }
      } catch (e) {
        console.error("waiting-all API fetch failed", e);
        waitingAll = null;
      }

      // fallback ถ้า API ใช้ไม่ได้จริง ๆ (อาจติด RLS)
      if (!waitingAll) {
        const { data: wRows, error: wErr } = await supabase
          .from("reservations")
          .select(
            "id,user_id,reservation_datetime,queue_code,status,created_at,partysize,customer_name"
          )
          .or("status.eq.waiting,status.eq.WAITING,status.ilike.waiting%")
          .order("reservation_datetime", { ascending: true })
          .order("created_at", { ascending: true });
        if (wErr) console.error("Supabase fallback error:", wErr.message);
        waitingAll = wErr ? [] : (wRows as any[]) ?? [];
      }

      setWaitingAllRows(waitingAll);

      // ---------- รวมสรุป ----------
      const tally = {
        all: todayRows.length || 0,
        waiting: waitingAll?.length ?? 0,
        confirmed: 0,
        seated: 0,
        paid: 0,
        cancelled: 0,
      };
      for (const r of todayRows) {
        const k = normalizeStatus?.(r?.status) ?? "";
        if (!k) continue;
        if (k === "waiting") continue;
        // @ts-expect-error index by key
        if (k in tally) tally[k] += 1;
      }
      setTotals(tally);
    } finally {
      setRowsLoading(false);
    }
  }, [supabase]);

  const setStatusParam = (key: StatusKey | "") => {
    const params = new URLSearchParams(sp?.toString?.() ?? "");
    if (!key) {
      params.delete("status");
    } else {
      if (statusParam === key) {
        params.delete("status");
      } else {
        params.set("status", key);
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

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

  const handleAssignTable = async (reservationId: string, tableNo: number) => {
    await assignTable(reservationId, tableNo);
    scheduleRefetch();
  };

  const handleMoveTable = async (
    reservationId: string,
    _fromNo: number,
    toNo: number
  ) => {
    await moveTable(reservationId, toNo);
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
      `/api/admin/reservations/${r.id}/occupied?${params.toString()}`
    );

    const list = await res.json();

    const occ: OccupiedItem[] = (list ?? [])
      .map(
        (o: {
          tableNo?: number;
          reservationId?: string | null;
          reservation_datetime?: string | null;
          queue_code?: string | null;
        }) => ({
          tableNo: Number(o.tableNo ?? 0),
          reservationId: o.reservationId ?? "",
          reservation_datetime: o.reservation_datetime ?? null,
          queue_code: o.queue_code ?? null,
        })
      )
      .filter(
        (x: { tableNo: any }) => Number.isFinite(x.tableNo) && x.tableNo > 0
      );

    setOccupied(occ);
  }, []);
  function normalize(s: string | null | undefined) {
    const v = (s ?? "").toLowerCase().trim();
    if (v.includes("cancel")) return "cancelled";
    if (v.startsWith("seat")) return "seated";
    if (v.startsWith("confirm")) return "confirmed";
    if (v.startsWith("paid") || v.startsWith("pay")) return "paid";
    if (v.startsWith("wait")) return "waiting";
    return v;
  }
  function filterByStatus<T extends { status?: string | null }>(
    row: T[],
    key: StatusKey | "" | undefined
  ) {
    if (!key) return row;
    const k = normalize(key);
    return row.filter((r) => normalize(r.status) === k);
  }
  const shownCount = filteredRows.length;
  const totalCount =
    statusParam === "waiting" ? waitingAllRows.length : rows.length;
  const [totals, setTotals] = useState<Totals>({
    all: 0,
    waiting: 0,
    confirmed: 0,
    seated: 0,
    paid: 0,
    cancelled: 0,
  });
  const statItems = useMemo(
    () => [
      {
        label: "Total Queue",
        value: totals.all,
        subtext: "รวมทั้งหมด",
        icon: <FontAwesomeIcon icon={faListCheck} />,
        className: "border-sky-200 text-sky-700",
        key: "" as const,
      },
      {
        label: "Waiting",
        value: totals.waiting,
        subtext: "คิวที่กำลังรอทั้งหมด",
        className: "border-amber-200 text-amber-700",
        key: "waiting" as const,
      },
      {
        label: "Confirmed",
        value: totals.confirmed,
        subtext: "คิววันนี้ที่ยืนยันแล้ว",
        className: "border-indigo-200 text-indigo-700",
        key: "confirmed" as const,
      },
      {
        label: "Seated",
        value: totals.seated,
        subtext: "กำลังนั่ง",
        className: "border-sky-200 text-sky-700",
        key: "seated" as const,
      },
      {
        label: "Paid",
        value: totals.paid,
        subtext: "ชำระเงินแล้ว",
        className: "border-emerald-200 text-emerald-700",
        key: "paid" as const,
      },
      {
        label: "Cancelled",
        value: totals.cancelled,
        subtext: "ยกเลิก",
        className: "border-rose-200 text-rose-700",
        key: "cancelled" as const,
      },
    ],
    [totals]
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
      <main className="max-w-6xl w-full space-y-4">
        <section className="mb-8">
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
            <div className="p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                <FontAwesomeIcon icon={faListCheck} />
                Queue-Management
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                คิววันนี้
              </h1>
              <p className="mt-1 text-sm text-gray-600">จัดการคิววันนี้</p>
            </div>
          </div>
        </section>

        <StatsGrid
          items={statItems}
          currentKey={statusParam}
          onSelect={setStatusParam}
        />
        <section className="bg-white rounded-2xl shadow-xl border">
          <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b">
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-900">คิววันนี้</div>
              <div className="mt-0.5">
                แสดง{" "}
                <span className="font-semibold text-gray-900">
                  {shownCount}
                </span>{" "}
                รายการ
                <span className="text-gray-400"> / ทั้งหมด {totalCount}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto ">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/90 text-gray-600 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70">
                <tr>
                  <th className="px-4 py-3 text-left">คิว</th>
                  <th className="px-4 py-3 text-left">ชื่อลูกค้า</th>
                  <th className="px-4 py-3 text-left">วัน-เวลา</th>
                  <th className="px-4 py-3 text-left">จำนวน</th>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-left">การจัดการ</th>
                </tr>
              </thead>

              <TodayQueueTable
                rows={filteredRows}
                onOpenDetail={openDetail}
                onConfirm={confirmReservation}
                rowsLoading={rowsLoading}
              />
              {!rowsLoading && shownCount === 0 && (
                <tbody>
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      ไม่พบรายการตามตัวกรอง ลองเลือกสถานะอื่น หรือกด “ทั้งหมด”
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        </section>

        <ReservationDetailModal
          key={detailRow?.id || "empty"}
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
            fetchReservations();
          }}
          currentTableNo={currentTableNo}
          onAssignTable={handleAssignTable}
          onMoveTable={handleMoveTable}
          occupied={occupied}
          onUpdated={fetchReservations}
        />
      </main>
    </div>
  );
}

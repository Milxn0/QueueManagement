/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import HistoryTable from "@/components/user/HistoryTable";
import UserReservationDetailModal from "@/components/user/UserReservationDetailModal";
import { updateReservationByUser } from "@/lib/reservations";
import type { Reservation } from "@/types/reservation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons/faClockRotateLeft";

type DetailRow = {
  id: string;
  reservation_datetime: string | null;
  partysize: number | string | null;
  queue_code: string | null;
  comment: string | null;
  status: string | null;
  users?: { name?: string | null } | null;
  user?: { name?: string | null } | null;
  tbl?: { table_name?: string | null } | null;
  table_name?: string | null;
  user_id?: string | null;
  cancelled_reason?: string | null;
  cancelled_by_user_id?: string | null;
  cancelled_by?: {
    id: string;
    name?: string | null;
    role?: string | null;
  } | null;
};

export default function UserReservationHistoryPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  type Me = { id: string; name?: string | null };
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMe(
        data.user
          ? {
              id: data.user.id,
              name:
                (data.user.user_metadata?.name as string | undefined) ??
                (data.user.user_metadata?.full_name as string | undefined) ??
                (data.user.user_metadata?.username as string | undefined) ??
                (data.user.email ? data.user.email.split("@")[0] : null),
            }
          : null
      );
    })();
  }, [supabase]);
  const [rows, setRows] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // detail modal
  const [detailRow, setDetailRow] = useState<DetailRow | null>(null);

  // refetch with join table for table_name
  // GET อ่านข้อมูลการจองของ user คนที่ login อยู่
  async function refetch() {
    if (!me?.id) return;
    const { data, error: qErr } = await supabase
      .from("reservations")
      .select(
        `
    id, user_id, reservation_datetime, partysize, queue_code, status, comment, created_at, table_id,
    cancelled_reason, cancelled_by_user_id, cancelled_at,
    users:users!reservations_user_id_fkey(name, phone),
    tbl:tables!reservations_table_id_fkey(table_name),
    cancelled_by:users!reservations_cancelled_by_user_id_fkey(id, name, role)
  `
      )
      .eq("user_id", me.id)
      .order("reservation_datetime", { ascending: false });

    if (qErr) {
      setError(qErr.message);
    } else {
      setRows((data ?? []) as Reservation[]);
    }
  }

  // โหลดด้วยคิวรีที่ join แล้วทันทีเมื่อรู้ me.id
  useEffect(() => {
    if (!me?.id) return;
    setLoading(true);
    (async () => {
      await refetch();
      setLoading(false);
    })();
  }, [me?.id]);

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows]);

  // modal handlers
  async function handleSubmitEdit(id: string, iso: string, size: number, cmedit: string) {
    if (!me?.id) return;
    await updateReservationByUser(id, me.id, iso, size, cmedit);
    await refetch();
  }

  async function handleCancelWithReason(id: string, reason: string) {
    if (!me?.id) return;
    const { error: err } = await supabase
      .from("reservations")
      .update({
        status: "cancelled",
        cancelled_reason: reason || "—",
        cancelled_by_user_id: me.id,
        cancelled_at: new Date().toISOString(),
      }) 
      .eq("id", id)
      .eq("user_id", me.id);
    if (err) {
      alert("ยกเลิกไม่สำเร็จ: " + err.message);
      return;
    }
    await refetch();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <FontAwesomeIcon icon={faClockRotateLeft} />
            ประวัติการจองคิว
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            ประวัติการจองคิว
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            สามารถตรวจสอบและแก้ไขคิวของตัวเองได้ที่นี่
          </p>
        </div>
      </div>

      {loading && (
        <div className="py-16 text-center text-gray-500">กำลังโหลด...</div>
      )}

      {!loading && error && (
        <div className="py-8 text-center text-red-600">{error}</div>
      )}

      {!loading && !error && (
        <HistoryTable rows={rows} onOpenDetail={(r) => setDetailRow(r)} />
      )}

      {empty && (
        <div className="py-16 text-center text-gray-500">
          ยังไม่มีประวัติการจอง
        </div>
      )}

      {detailRow && (
        <UserReservationDetailModal
          open={Boolean(detailRow)}
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onSubmitEdit={handleSubmitEdit}
          onCancelWithReason={(id, reason) =>
            handleCancelWithReason(id, reason)
          }
          fallbackName={
            detailRow?.users?.name?.trim() ||
            detailRow?.user?.name?.trim() ||
            me?.name?.trim() ||
            undefined
          }
        />
      )}
    </div>
  );
}

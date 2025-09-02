/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";

type Reservation = {
  users: any;
  id: string;
  user_id: string;
  reservation_datetime: string;
  partysize: number | string;
  queue_code: string | null;
  status: "pending" | "confirmed" | "seated" | "served" | "cancelled" | string;
  created_at: string;
  table_id: string | null;
};

export default function UserReservationHistoryPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [rows, setRows] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // edit modal states
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [editDateTime, setEditDateTime] = useState<string>("");
  const [editPartySize, setEditPartySize] = useState<string>("");

  // ---------- helpers ----------
  const tz = "Asia/Bangkok";

  function toLocalInputValue(iso: string) {
    // convert ISO -> "yyyy-MM-ddTHH:mm" in Bangkok time for <input type="datetime-local">
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.toLocaleString("en-CA", { timeZone: tz, year: "numeric" });
    const m = pad(
      Number(d.toLocaleString("en-CA", { timeZone: tz, month: "2-digit" }))
    );
    const day = pad(
      Number(d.toLocaleString("en-CA", { timeZone: tz, day: "2-digit" }))
    );
    const hh = pad(
      Number(
        d.toLocaleString("en-CA", {
          timeZone: tz,
          hour: "2-digit",
          hour12: false,
        })
      )
    );
    const mm = pad(
      Number(d.toLocaleString("en-CA", { timeZone: tz, minute: "2-digit" }))
    );
    return `${y}-${m}-${day}T${hh}:${mm}`;
  }

  function localInputToISO(localStr: string) {
    const [date, time] = localStr.split("T");
    const [Y, M, D] = date.split("-").map(Number);
    const [h, i] = time.split(":").map(Number);
    const utcMs = Date.UTC(Y, (M ?? 1) - 1, D ?? 1, h ?? 0, i ?? 0);
    const bangkokOffsetMs = 7 * 60 * 60 * 1000;
    const realUtc = new Date(utcMs - bangkokOffsetMs);
    return realUtc.toISOString();
  }

  function formatBangkok(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("th-TH", {
      timeZone: tz,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const canModify = (status: Reservation["status"]) =>
    ["pending", "confirmed"].includes(status);

  // ---------- data load ----------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      // 1) get current user
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        // ถ้าไม่พบผู้ใช้ -> ส่งไปหน้า login (ปรับ path ตามระบบคุณ)
        router.push("/auth/login");
        return;
      }
      setMe({ id: userData.user.id });

      // 2) fetch my reservations only
      const { data, error: qErr } = await supabase
        .from("reservations")
        .select(
          "id, user_id, reservation_datetime, partysize, queue_code, status, created_at, table_id, users!reservations_user_id_fkey(name, phone)"
        )

        .eq("user_id", userData.user.id)
        .order("reservation_datetime", { ascending: false });

      if (qErr) {
        setError(qErr.message);
      } else {
        setRows((data ?? []) as Reservation[]);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refetch() {
    if (!me?.id) return;
    const { data, error: qErr } = await supabase
      .from("reservations")
      .select(
        "id, user_id, reservation_datetime, partysize, queue_code, status, created_at, table_id, users!reservations_user_id_fkey(name, phone)"
      )

      .eq("user_id", me.id)
      .order("reservation_datetime", { ascending: false });

    if (qErr) {
      setError(qErr.message);
    } else {
      setRows((data ?? []) as Reservation[]);
    }
  }

  // ---------- actions ----------
  function openEditModal(r: Reservation) {
    setEditing(r);
    setEditDateTime(toLocalInputValue(r.reservation_datetime));
    setEditPartySize(String(r.partysize ?? ""));
  }

  async function submitEdit() {
    if (!editing) return;
    const iso = localInputToISO(editDateTime);
    const size = Number(editPartySize);
    if (!Number.isFinite(size) || size <= 0) {
      alert("จำนวนคนต้องเป็นตัวเลขมากกว่า 0");
      return;
    }

    const { error: upErr } = await supabase
      .from("reservations")
      .update({
        reservation_datetime: iso,
        partysize: size,
      })
      .eq("id", editing.id)
      .eq("user_id", me?.id ?? "")
      .select()
      .single();

    if (upErr) {
      alert("แก้ไขไม่สำเร็จ: " + upErr.message);
      return;
    }
    setEditing(null);
    await refetch();
  }

  async function cancelReservation(r: Reservation) {
    if (!confirm(`ยืนยันยกเลิกคิว ${r.queue_code ?? r.id}?`)) return;

    const { error: upErr } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", r.id)
      .eq("user_id", me?.id ?? "")
      .select()
      .single();

    if (upErr) {
      alert("ยกเลิกไม่สำเร็จ: " + upErr.message);
      return;
    }
    await refetch();
  }

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows]);

  // ---------- UI ----------
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
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
        <div className="space-y-3">
          <div className="h-10 rounded-xl bg-gray-200/30 animate-pulse" />
          <div className="h-10 rounded-xl bg-gray-200/30 animate-pulse" />
          <div className="h-10 rounded-xl bg-gray-200/30 animate-pulse" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {empty && (
        <div className="rounded-xl border px-4 py-5 bg-gray-50">
          <p className="text-sm">
            ตอนนี้คุณยังไม่มีคิว —{" "}
            <Link
              className="text-indigo-600 underline"
              href="/user/reservation"
            >
              จองคิว
            </Link>{" "}
            ได้เลย
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
          <table className="min-w-full text-sm">
            <thead className="bg-white">
              <tr className="text-left text-indigo-600">
                <th className="px-4 py-3">รหัสคิว</th>
                <th className="px-4 py-3">ชื่อผู้จอง</th>
                <th className="px-4 py-3">เบอร์โทรศัพท์</th>
                <th className="px-4 py-3">วันเวลา</th>
                <th className="px-4 py-3">จำนวนคน</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="px-4 py-3 font-medium">
                    {r.queue_code ?? "-"}
                  </td>
                  <td className="px-4 py-3">{r.users?.name ?? "-"}</td>
                  <td className="px-4 py-3">{r.users?.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    {formatBangkok(r.reservation_datetime)}
                  </td>
                  <td className="px-4 py-3">{r.partysize}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        r.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : r.status === "confirmed"
                          ? "bg-blue-100 text-blue-800"
                          : r.status === "cancelled"
                          ? "bg-red-100 text-red-800 line-through"
                          : "bg-gray-100 text-gray-800",
                      ].join(" ")}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-xl border px-3 py-1.5 text-sm hover:bg-indigo-50  disabled:opacity-50"
                        disabled={!canModify(r.status)}
                        onClick={() => openEditModal(r)}
                        title={
                          canModify(r.status)
                            ? "แก้ไขการจอง"
                            : "ไม่สามารถแก้ไขสถานะนี้ได้"
                        }
                      >
                        แก้ไข
                      </button>
                      <button
                        className="rounded-xl border px-3 py-1.5 text-sm hover:bg-red-50 border-red-300 text-red-700 disabled:opacity-50"
                        disabled={!canModify(r.status)}
                        onClick={() => cancelReservation(r)}
                        title={
                          canModify(r.status)
                            ? "ยกเลิกการจอง"
                            : "ไม่สามารถยกเลิกสถานะนี้ได้"
                        }
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-indigo-600 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-indigo-100 px-4 py-3">
              <h2 className="text-base font-semibold text-indigo-600">
                แก้ไขการจอง
              </h2>
              <button
                className="rounded-full p-1.5 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="m12 10.586l4.95-4.95l1.414 1.414L13.414 12l4.95 4.95l-1.414 1.414L12 13.414l-4.95 4.95l-1.414-1.414L10.586 12l-4.95-4.95L7.05 5.636z"
                  />
                </svg>
              </button>
            </div>
            <div className="px-4 py-4">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-gray-700">
                    วันเวลาใหม่
                  </span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    value={editDateTime}
                    onChange={(e) => setEditDateTime(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-gray-700">
                    จำนวนคน
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    value={editPartySize}
                    onChange={(e) => setEditPartySize(e.target.value)}
                  />
                </label>
                <p className="text-xs text-gray-500">
                  *แก้ไขได้เมื่อสถานะเป็น{" "}
                  <span className="font-medium text-red-500">pending</span>{" "}
                  เท่านั้น
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-indigo-100 px-4 py-3">
              <button
                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onClick={() => setEditing(null)}
              >
                ปิด
              </button>
              <button
                className="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onClick={submitEdit}
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

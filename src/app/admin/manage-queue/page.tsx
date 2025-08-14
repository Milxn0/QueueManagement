/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

type Status =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show"
  | string;

type Reservation = {
  id: string;
  user_id: string;
  queue_code: string | null;
  reservation_datetime: string; // ISO
  partysize: number | null;
  status: Status;
  user?: { name: string | null; phone: string | null; email: string | null } | null;
};

export default function ManageQueuePage() {
  const supabase = createClient();

  // auth
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // data
  const [rows, setRows] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  // dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menusRef = useRef<Record<string, HTMLDivElement | null>>({});

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Reservation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- helpers ---
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const badge = (s: Status) => {
    const map: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      confirmed: "bg-indigo-100 text-indigo-700",
      seated: "bg-amber-100 text-amber-700",
      completed: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
      no_show: "bg-yellow-100 text-yellow-700",
    };
    return map[s] || "bg-gray-100 text-gray-700";
  };

  // อนุญาต action ตามสถานะปัจจุบัน
  const allowedTransitions: Record<Status, Status[]> = {
    pending: ["confirmed", "seated", "cancelled", "no_show"],
    confirmed: ["seated", "cancelled", "no_show", "completed"],
    seated: ["completed", "cancelled", "no_show"],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  const can = (from: Status, to: Status) =>
    allowedTransitions[from]?.includes(to);

  // --- auth / bootstrap ---
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);

      const { data: u } = await supabase.auth.getUser();
      if (!mounted) return;

      const authUser = u.user;
      setIsLoggedIn(!!authUser);

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: me, error: meErr } = await supabase
        .from("users")
        .select("role")
        .eq("id", authUser.id)
        .single();

      if (meErr) {
        setError(meErr.message);
        setLoading(false);
        return;
      }

      const admin = me?.role === "admin";
      setIsAdmin(admin);

      if (admin) {
        await fetchReservations();
        const ch = supabase
          .channel("reservations-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, fetchReservations)
          .subscribe();
        return () => supabase.removeChannel(ch);
      }

      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: { user: any; }) => {
      setIsLoggedIn(!!s?.user);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // --- fetch ---
  const fetchReservations = async () => {
    setMsg(null);
    setError(null);

    const { data, error } = await supabase
      .from("reservations")
      .select(
        "id,user_id,queue_code,reservation_datetime,partysize,status,users(name,phone,email)"
      )
      .order("reservation_datetime", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const mapped: Reservation[] = (data as any[]).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      queue_code: r.queue_code ?? null,
      reservation_datetime: r.reservation_datetime,
      partysize: r.partysize ?? null,
      status: r.status,
      user: r.users
        ? { name: r.users.name, phone: r.users.phone, email: r.users.email }
        : null,
    }));

    setRows(mapped);
    setLoading(false);
  };

  // --- actions ---
  const updateStatus = async (id: string, newStatus: Status) => {
    setError(null);
    setMsg(null);
    const { error } = await supabase
      .from("reservations")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) setError(error.message);
    else setMsg("อัปเดตสถานะสำเร็จ");
  };

  const askDelete = (r: Reservation) => {
    setToDelete(r);
    setConfirmOpen(true);
    setOpenMenuId(null);
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setError(null);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", toDelete.id);
      if (error) throw error;
      setMsg("ลบคิวสำเร็จ");
      setConfirmOpen(false);
      setToDelete(null);
    } catch (e: any) {
      setError(e?.message || "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  };

  // ปิด dropdown เมื่อคลิกนอกเมนู
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!openMenuId) return;
      const target = e.target as Node;
      const menuNode = menusRef.current[openMenuId];
      if (menuNode && !menuNode.contains(target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenuId]);

  // --- filter + search ---
  const filtered = useMemo(() => {
    let arr = rows.slice();
    if (statusFilter !== "all") arr = arr.filter((r) => r.status === statusFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter((r) => {
        const n = r.user?.name?.toLowerCase() || "";
        const p = r.user?.phone?.toLowerCase() || "";
        const code = (r.queue_code || "").toLowerCase();
        return n.includes(s) || p.includes(s) || code.includes(s);
      });
    }
    return arr.sort(
      (a, b) =>
        new Date(a.reservation_datetime).getTime() -
        new Date(b.reservation_datetime).getTime()
    );
  }, [rows, statusFilter, q]);

  // ---------- UI ----------
  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="animate-pulse h-7 w-48 bg-gray-200 rounded mb-4" />
        <div className="animate-pulse h-40 bg-gray-200 rounded" />
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-lg font-semibold text-amber-800">กรุณาเข้าสู่ระบบก่อน</h1>
          <div className="mt-3 flex gap-3">
            <Link href="/auth/login" className="rounded-xl bg-indigo-600 text-white px-4 py-2">
              เข้าสู่ระบบ
            </Link>
            <Link href="/auth/register" className="rounded-xl border px-4 py-2">
              สมัครสมาชิก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700">
          <h1 className="text-lg font-semibold">403 – ต้องเป็นแอดมินเท่านั้น</h1>
          <p className="text-sm mt-1">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6 text-indigo-600">Manage Queue</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา: ชื่อ / เบอร์ / รหัสคิว"
          className="w-full sm:max-w-xs rounded-lg border px-3 py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="w-full sm:w-48 rounded-lg border px-3 py-2"
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="pending">pending</option>
          <option value="confirmed">confirmed</option>
          <option value="seated">seated</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
          <option value="no_show">no_show</option>
        </select>
        <button
          onClick={fetchReservations}
          className="rounded-lg border px-3 py-2 hover:bg-gray-50"
        >
          รีเฟรช
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border shadow-md">
        <table className="min-w-full text-sm">
          <thead className="bg-white">
            <tr className="text-left text-indigo-600">
              <th className="px-4 py-3">เวลา</th>
              <th className="px-4 py-3">รหัสคิว</th>
              <th className="px-4 py-3">ชื่อ</th>
              <th className="px-4 py-3">เบอร์</th>
              <th className="px-4 py-3">จำนวนคน</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3 w-[220px]">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filtered.map((r) => {
              const menuOpen = openMenuId === r.id;
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 whitespace-nowrap">{fmt(r.reservation_datetime)}</td>
                  <td className="px-4 py-3 font-mono">{r.queue_code ?? "-"}</td>
                  <td className="px-4 py-3">{r.user?.name ?? "-"}</td>
                  <td className="px-4 py-3">{r.user?.phone ?? "-"}</td>
                  <td className="px-4 py-3">{r.partysize ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${badge(r.status)}`}>
                      {r.status}
                    </span>
                  </td>

                  {/* Actions: Edit -> Dropdown */}
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setOpenMenuId(menuOpen ? null : r.id)}
                      className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 inline-flex items-center gap-1"
                    >
                      Edit
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>

                    {menuOpen && (
                      <div
                        ref={(el: HTMLDivElement | null) => {
                          menusRef.current[r.id] = el;
                        }}
                        className="absolute right-0 z-20 mt-2 w-56 rounded-xl border bg-white shadow-lg"
                      >
                        <div className="py-1">
                          {/* เปลี่ยนสถานะ */}
                          <MenuItem
                            disabled={!can(r.status, "confirmed")}
                            onClick={() => {
                              updateStatus(r.id, "confirmed");
                              setOpenMenuId(null);
                            }}
                            label="Set status: confirmed"
                          />
                          <MenuItem
                            disabled={!can(r.status, "seated")}
                            onClick={() => {
                              updateStatus(r.id, "seated");
                              setOpenMenuId(null);
                            }}
                            label="Set status: seated"
                          />
                          <MenuItem
                            disabled={!can(r.status, "completed")}
                            onClick={() => {
                              updateStatus(r.id, "completed");
                              setOpenMenuId(null);
                            }}
                            label="Set status: completed"
                          />
                          <MenuItem
                            disabled={!can(r.status, "no_show")}
                            onClick={() => {
                              updateStatus(r.id, "no_show");
                              setOpenMenuId(null);
                            }}
                            label="Set status: no_show"
                          />
                          <MenuItem
                            disabled={!can(r.status, "cancelled")}
                            onClick={() => {
                              updateStatus(r.id, "cancelled");
                              setOpenMenuId(null);
                            }}
                            label="Set status: cancelled"
                          />

                          <div className="my-1 h-px bg-gray-100" />

                          {/* ลบ */}
                          <MenuItem
                            danger
                            onClick={() => askDelete(r)}
                            label="Delete reservation"
                          />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  ไม่พบคิวตรงตามเงื่อนไข
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Delete Modal */}
      {confirmOpen && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">ยืนยันการลบคิว</h2>
            <p className="text-sm text-gray-600 mt-2">
              ต้องการลบคิว <b>{toDelete.queue_code || toDelete.id}</b> ใช่หรือไม่?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border px-4 py-2 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 text-white px-4 py-2 hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "กำลังลบ..." : "ลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** เมนูรายการมาตรฐาน */
function MenuItem({
  label,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        "w-full text-left px-4 py-2 text-sm",
        "hover:bg-gray-50",
        disabled ? "opacity-40 cursor-not-allowed" : "",
        danger ? "text-red-600 hover:bg-red-50" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsersGear,
  faTriangleExclamation,
  faCircleCheck,
  faMagnifyingGlass,
  faEye,
  faCrown,
  faUserTie,
  faUser,
  faUserGear,
} from "@fortawesome/free-solid-svg-icons";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";
import AddUserModal from "@/components/admin/AddUserModal";
import UserDetailModal, {
  AppUser,
  Role,
} from "@/components/admin/UserDetailModal";

export default function ManageUsersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // UI helpers
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "admin" | "staff" | "customer"
  >("all");

  // Modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<AppUser | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // ---------------- data ----------------
  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }, []);

  // ---------------- derived ----------------
  const filteredUsers = users.filter((u) => {
    const passRole = roleFilter === "all" ? true : u.role === roleFilter;
    if (!passRole) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const vals = [u.name, u.email, u.phone, u.role, u.id].map((x) =>
      (x ?? "").toString().toLowerCase()
    );
    return vals.some((v) => v.includes(q));
  });
  // ---------------- init / auth ----------------
  useEffect(() => {
    let mounted = true;
    let ch: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      setLoading(true);
      setError(null);

      const { data: userRes } = await supabase.auth.getUser();
      if (!mounted) return;

      const authUser = userRes.user;
      setIsLoggedIn(!!authUser);
      setCurrentUid(authUser?.id ?? null);

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
        await fetchUsers();
        ch = supabase
          .channel("users-changes")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "users" },
            fetchUsers
          )
          .subscribe();
      } else {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (ch) supabase.removeChannel(ch);
    };
  }, [supabase, fetchUsers]);

  // ---------------- UI states ----------------
  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70">
          <div className="p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
              <FontAwesomeIcon icon={faUsersGear} />
              Manage Users
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
              กำลังโหลด…
            </h1>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-gray-200"
            />
          ))}
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-lg font-semibold text-amber-800">
            กรุณาเข้าสู่ระบบก่อน
          </h1>
          <div className="mt-3 flex gap-3">
            <Link
              href="/auth/login"
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/auth/register"
              className="rounded-xl border px-4 py-2 hover:bg-gray-50"
            >
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
          <h1 className="text-lg font-semibold">
            403 – ต้องเป็นแอดมินเท่านั้น
          </h1>
          <p className="text-sm mt-1">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <FontAwesomeIcon icon={faUsersGear} />
            Manage
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            จัดการผู้ใช้ในระบบ
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            เปิดดูรายละเอียด / แก้ไข / รีเซ็ตรหัสผ่าน / ลบ ได้
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}
      {msg && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5" />
          <div className="text-sm">{msg}</div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">บทบาท</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="all">ทั้งหมด</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="customer">Customer</option>
          </select>
        </div>

        <div className="md:ml-auto flex items-center gap-2">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา: ชื่อ / อีเมล / เบอร์ / role / id"
              className="w-72 rounded-xl border pl-9 pr-3 py-2 text-sm"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <div className="text-xs text-gray-500">
            พบ {filteredUsers.length} รายการ
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="ml-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <FontAwesomeIcon icon={faUserPlus} />
            เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">User ID</th>
              <th className="px-5 py-4 font-semibold min-w-[180px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  ไม่พบผู้ใช้ตามเงื่อนไขที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredUsers
                .slice()
                .sort((a, b) => {
                  const order: Record<string, number> = {
                    admin: 0,
                    manager: 1,
                    staff: 2,
                    customer: 3,
                  };
                  const ra = order[(a.role ?? "").toLowerCase()] ?? 99;
                  const rb = order[(b.role ?? "").toLowerCase()] ?? 99;
                  return ra !== rb
                    ? ra - rb
                    : (a.name ?? "").localeCompare(b.name ?? "");
                })
                .map((u) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      {(() => {
                        const role = (u.role ?? "").toLowerCase();
                        const cfg =
                          role === "admin"
                            ? {
                                cls: "bg-indigo-50 text-indigo-700 ring-indigo-200",
                                icon: faCrown,
                              }
                            : role === "manager"
                            ? {
                                cls: "bg-pink-50 text-pink-700 ring-pink-200",
                                icon: faUserTie,
                              }
                            : role === "staff"
                            ? {
                                cls: "bg-amber-50 text-amber-700 ring-amber-200",
                                icon: faUserGear,
                              }
                            : {
                                cls: "bg-gray-100 text-gray-700 ring-gray-200",
                                icon: faUser,
                              };

                        return (
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs ring-1",
                              cfg.cls,
                            ].join(" ")}
                          >
                            <FontAwesomeIcon
                              icon={cfg.icon}
                              className="h-3.5 w-3.5"
                            />
                            <span className="capitalize">{role || "-"}</span>
                          </span>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3">{u.name ?? "-"}</td>
                    <td className="px-4 py-3">{u.email ?? "-"}</td>
                    <td className="px-4 py-3">{u.phone ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                      {u.id}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => {
                          setDetailUser(u);
                          setDetailOpen(true);
                          setMsg(null);
                          setError(null);
                        }}
                         className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 whitespace-nowrap"
                      >
                        <FontAwesomeIcon icon={faEye} />
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <UserDetailModal
        open={detailOpen}
        user={detailUser}
        currentUid={currentUid}
        onClose={() => setDetailOpen(false)}
        onUpdated={async () => {
          await fetchUsers();
          setDetailUser((prev) =>
            prev ? users.find((u) => u.id === prev.id) ?? prev : prev
          );
          setMsg("อัปเดตข้อมูลผู้ใช้สำเร็จ");
          setTimeout(() => setMsg(null), 2000);
        }}
        onDeleted={async () => {
          await fetchUsers();
          setDetailOpen(false);
          setMsg("ลบผู้ใช้สำเร็จ");
          setTimeout(() => setMsg(null), 2000);
        }}
      />
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async () => {
          await fetchUsers();
          setMsg("สร้างผู้ใช้สำเร็จ");
          setTimeout(() => setMsg(null), 2000);
        }}
      />
    </main>
  );
}

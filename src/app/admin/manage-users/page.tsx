/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

type Role = "admin" | "staff" | "customer" | string;

type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  created_at?: string | null;
};

export default function ManageUsersPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<AppUser>>({});
  const [saving, setSaving] = useState(false);

  // delete state (confirm modal)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---------------- init / auth ----------------
  useEffect(() => {
    let mounted = true;

    const init = async () => {
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

      // อ่าน role ของตัวเอง
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
        await fetchUsers(); // ดึงทั้งหมด (RLS จะเปิดเฉพาะ admin)
        const ch = supabase
          .channel("users-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: "users" }, fetchUsers)
          .subscribe();
        return () => {
          supabase.removeChannel(ch);
        };
      }

      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
      setCurrentUid(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // ---------------- data ----------------
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,phone,role,created_at");

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // admin ไว้บนสุด
    const weight = (u: AppUser) => (u.role === "admin" ? 0 : 1);
    const sorted = (data ?? []).slice().sort((a, b) => weight(a) - weight(b));

    setUsers(sorted);
    setLoading(false);
  };

  // ---------------- edit handlers ----------------
  const startEdit = (u: AppUser) => {
    setMsg(null);
    setError(null);
    setEditingId(u.id);
    setForm({ name: u.name ?? "", email: u.email ?? "", phone: u.phone ?? "", role: u.role });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      // กันไม่ให้ลดสิทธิ์ตัวเองผ่านหน้าจอนี้
      const updatePayload: Partial<AppUser> = { ...form };
      if (editingId === currentUid) {
        delete updatePayload.role; // ไม่ให้แก้ role ของตัวเอง
      }

      const { error } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", editingId);

      if (error) throw error;
      setMsg("อัปเดตข้อมูลผู้ใช้สำเร็จ");
      setEditingId(null);
      setForm({});
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message || "ไม่สามารถบันทึกการแก้ไขได้");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- delete handlers ----------------
  const askDelete = (u: AppUser) => {
    setMsg(null);
    setError(null);
    if (u.id === currentUid) {
      setError("ไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }
    setToDelete(u);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setError(null);
    setMsg(null);
    try {
      const { error } = await supabase.from("users").delete().eq("id", toDelete.id);
      if (error) throw error;
      setMsg("ลบผู้ใช้สำเร็จ");
      setConfirmOpen(false);
      setToDelete(null);
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message || "ไม่สามารถลบผู้ใช้ได้");
    } finally {
      setDeleting(false);
    }
  };

  // ---------------- UI states ----------------
  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
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
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Manage Users</h1>

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

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isEditing = editingId === u.id;
              const isSelf = currentUid === u.id;

              return (
                <tr key={u.id} className="border-t">
                  {/* Role */}
                  <td className="px-4 py-3">
                    {!isEditing ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs
                        ${u.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {u.role}
                      </span>
                    ) : (
                      <select
                        className="rounded border px-2 py-1"
                        value={(form.role as Role) ?? u.role}
                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                        disabled={isSelf} // กันแก้ role ตัวเอง
                      >
                        <option value="admin">admin</option>
                        <option value="staff">staff</option>
                        <option value="customer">customer</option>
                      </select>
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    {!isEditing ? (
                      u.name ?? "-"
                    ) : (
                      <input
                        className="w-full rounded border px-2 py-1"
                        value={(form.name as string) ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3">
                    {!isEditing ? (
                      u.email ?? "-"
                    ) : (
                      <input
                        type="email"
                        className="w-full rounded border px-2 py-1"
                        value={(form.email as string) ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3">
                    {!isEditing ? (
                      u.phone ?? "-"
                    ) : (
                      <input
                        className="w-full rounded border px-2 py-1"
                        value={(form.phone as string) ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    )}
                  </td>

                  {/* User ID */}
                  <td className="px-4 py-3 font-mono text-[11px]">{u.id}</td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {!isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(u)}
                          className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => askDelete(u)}
                          className="rounded-lg bg-red-600 text-white px-3 py-1 hover:bg-red-700 disabled:opacity-60"
                          disabled={isSelf}
                          title={isSelf ? "ห้ามลบบัญชีของตัวเอง" : ""}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="rounded-lg bg-emerald-600 text-white px-3 py-1 hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm Delete Modal */}
      {confirmOpen && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">ยืนยันการลบผู้ใช้</h2>
            <p className="text-sm text-gray-600 mt-2">
              คุณต้องการลบผู้ใช้{" "}
              <b>{toDelete.name || toDelete.email || toDelete.id}</b> ใช่หรือไม่?
              การลบอาจกระทบข้อมูลที่ผูกอยู่ (เช่น การจอง)
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

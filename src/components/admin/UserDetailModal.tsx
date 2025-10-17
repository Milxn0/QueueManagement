/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faFloppyDisk,
  faTrash,
  faCopy,
  faUserShield,
  faUser,
  faPhone,
  faAt,
  faCircleCheck,
  faTriangleExclamation,
  faLock,
  faEye,
  faEyeSlash,
  faCrown,
  faUserGear,
  faUserTie,
  faAddressCard,
} from "@fortawesome/free-solid-svg-icons";

export type Role = "admin" | "staff" | "customer" | string;

export type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  created_at?: string | null;
};

const TH_TZ = "Asia/Bangkok";
const formatDateTime = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TH_TZ,
  });
};

export default function UserDetailModal({
  open,
  user,
  currentUid,
  onClose,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  user: AppUser | null;
  currentUid: string | null;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1>(0);

  // ฟอร์มแก้ไขข้อมูลผู้ใช้
  const [form, setForm] = useState<Partial<AppUser>>({});
  const isSelf = user?.id === currentUid;

  // ฟอร์มเปลี่ยนรหัสผ่าน
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setMsg(null);
    setErr(null);
    setDeleteStep(0);
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role,
    });
    setNewPassword("");
    setConfirmPassword("");
    setPwBusy(false);
  }, [open, user]);

  if (!open || !user) return null;

  const canEditRole = !isSelf; // กันเปลี่ยน role ตัวเอง
  const displayName = (form.name as string) || user.name || user.email || "—";

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setMsg("คัดลอก User ID แล้ว");
      setTimeout(() => setMsg(null), 1600);
    } catch {}
  };

  const validateProfile = () => {
    const email = (form.email ?? "").toString().trim();
    const originalEmail = (user?.email ?? "").toString().trim();

    if (email !== originalEmail) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErr("รูปแบบอีเมลไม่ถูกต้อง");
        return false;
      }
    }

    const phone = (form.phone ?? "").toString().trim();
    if (phone && phone.length < 6) {
      setErr("กรุณากรอกเบอร์โทรให้ถูกต้อง");
      return false;
    }
    return true;
  };

  const save = async () => {
    setErr(null);
    setMsg(null);
    if (!validateProfile()) return;

    setBusy(true);
    try {
      const payload: Partial<AppUser> = { ...form };
      if (isSelf) {
        // เจ้าของบัญชีแก้ของตัวเอง
        const { error } = await supabase
          .from("users")
          .update(payload)
          .eq("id", user.id);
        if (error) throw error;
      } else {
        const res = await fetch("/api/admin/users/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: user.id, payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "บันทึกไม่สำเร็จ");
      }
      setMsg("บันทึกข้อมูลผู้ใช้สำเร็จ");
      onUpdated?.();
    } catch (e: any) {
      setErr(e?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  // เปลี่ยนรหัสผ่าน
  const changePassword = async () => {
    setErr(null);
    setMsg(null);

    const pwd = newPassword.trim();
    const cf = confirmPassword.trim();

    if (pwd.length < 8) {
      setErr("รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (pwd !== cf) {
      setErr("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setPwBusy(true);
    try {
      if (isSelf) {
        const { error } = await supabase.auth.updateUser({ password: pwd });
        if (error) throw error;
        setMsg("เปลี่ยนรหัสผ่านเรียบร้อย");
      } else {
        const res = await fetch("/api/admin/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, newPassword: pwd }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
        setMsg("เปลี่ยนรหัสผ่านผู้ใช้เรียบร้อย");
      }
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setErr(e?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
    } finally {
      setPwBusy(false);
    }
  };

  const doDelete = async () => {
    if (isSelf) {
      setErr("ไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }
    setDelBusy(true);
    setErr(null);
    setMsg(null);

    try {
      // 1) ย้าย userid ของ reservations ไปเป็นผู้ใช้ระบบ "delete_user"
      const DELETE_USER_ID = "00000000-0000-0000-0000-000000000001";
      const { error: reassignErr } = await supabase
        .from("reservations")
        .update({ user_id: DELETE_USER_ID })
        .eq("user_id", user.id);
      if (reassignErr) throw reassignErr;

      // 2) ลบจาก Supabase 
      const tryDeleteAuth = async () => {
        const fallback = await fetch("/api/admin/users/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: user.id, onlyAuth: true }),
        });
        if (!fallback.ok) {
          const js = await fallback.json().catch(() => ({}));
          throw new Error(js?.error || "ลบผู้ใช้ออกจาก Auth ไม่สำเร็จ");
        }
      };
      await tryDeleteAuth();

      // 3) ลบ record ใน public.users
      const { error: delUserErr } = await supabase
        .from("users")
        .delete()
        .eq("id", user.id);
      if (delUserErr) throw delUserErr;

      setMsg("ลบผู้ใช้สำเร็จ");
      onDeleted?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "ลบไม่สำเร็จ");
    } finally {
      setDelBusy(false);
      setDeleteStep(0);
    }
  };

  const roleBadge = (role?: string | null) => {
    const v = (role ?? "").toLowerCase();
    if (v === "admin")
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
    if (v === "staff")
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    if (v === "manager") return "bg-pink-50 text-pink-700 ring-1 ring-pink-200";
    return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
  };
  const roleIcon = (role?: string | null) => {
    const v = (role ?? "").toLowerCase();
    if (v === "admin") return faCrown;
    if (v === "staff") return faUserGear;
    if (v === "manager") return faUserTie;
    return faUser;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        aria-label="close-backdrop"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                <FontAwesomeIcon icon={faAddressCard} />
                รายละเอียดผู้ใช้
              </div>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">
                {displayName}
              </h3>
              <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 gap-1.5 ${roleBadge(
                    ((form.role as Role) ?? user.role) || ""
                  )}`}
                >
                  {(() => {
                    const roleVal = ((form.role as Role) ?? user.role) || "";
                    return (
                      <>
                        <FontAwesomeIcon
                          icon={roleIcon(roleVal)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="capitalize">{roleVal || "-"}</span>
                      </>
                    );
                  })()}
                </span>

                <span className="text-gray-400">•</span>
                <span>
                  สร้างเมื่อ: {formatDateTime(user.created_at ?? null)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition hover:bg-white hover:text-gray-700"
              aria-label="ปิด"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(err || msg) && (
          <div className="px-6 pt-4">
            {err && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-sm">
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="mt-0.5"
                />
                <span>{err}</span>
              </div>
            )}
            {msg && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 text-sm">
                <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5" />
                <span>{msg}</span>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 pb-5">
          {/* Profile form */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <label className="text-xs text-gray-500 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} />
                ชื่อ
              </label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={(form.name as string) ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="ชื่อผู้ใช้"
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <label className="text-xs text-gray-500 flex items-center gap-2">
                <FontAwesomeIcon icon={faAt} />
                อีเมล
              </label>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={(form.email as string) ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="email@example.com"
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <label className="text-xs text-gray-500 flex items-center gap-2">
                <FontAwesomeIcon icon={faPhone} />
                เบอร์โทร
              </label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={(form.phone as string) ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="08x-xxx-xxxx"
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <label className="text-xs text-gray-500 flex items-center gap-2">
                <FontAwesomeIcon icon={faUserShield} />
                บทบาท
              </label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-60"
                value={(form.role as Role) ?? user.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                disabled={!canEditRole}
                title={isSelf ? "ไม่สามารถเปลี่ยนบทบาทของบัญชีตัวเองได้" : ""}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>

          {/* Utility row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="text-[11px] text-gray-500 rounded-full bg-gray-50 ring-1 ring-gray-200 px-2 py-1">
              User ID: <span className="font-mono">{user.id}</span>
            </div>
            <button
              type="button"
              onClick={copyUid}
              className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
              title="คัดลอก User ID"
            >
              <FontAwesomeIcon icon={faCopy} /> คัดลอก ID
            </button>

            <div className="md:ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faFloppyDisk} />{" "}
                {busy ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteStep(1)}
                disabled={isSelf}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                title={isSelf ? "ห้ามลบบัญชีของตัวเอง" : ""}
              >
                <FontAwesomeIcon icon={faTrash} /> ลบผู้ใช้
              </button>
            </div>
          </div>

          {/* Change password */}
          <div className="mt-5 rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
              <FontAwesomeIcon icon={faLock} className="text-gray-600" />
              <div className="text-sm font-semibold text-gray-800">
                เปลี่ยนรหัสผ่าน
              </div>
              <div className="ml-auto text-[11px] text-gray-500">
                {isSelf
                  ? "เปลี่ยนรหัสผ่านของบัญชีตัวเอง"
                  : "แอดมินเปลี่ยนรหัสผ่านให้ผู้ใช้"}
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">รหัสผ่านใหม่</label>
                <div className="mt-1 relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="w-full rounded-xl border px-3 py-2 text-sm pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">ยืนยันรหัสผ่าน</label>
                <input
                  type={showPw ? "text" : "password"}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  แนะนำ: ใช้รหัสผ่านที่เดายาก มีทั้งตัวพิมพ์เล็ก/ใหญ่ ตัวเลข
                  และสัญลักษณ์
                </div>
                <button
                  type="button"
                  onClick={changePassword}
                  disabled={pwBusy || !newPassword || !confirmPassword}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {pwBusy ? "กำลังเปลี่ยน..." : "ยืนยันเปลี่ยนรหัสผ่าน"}
                </button>
              </div>
            </div>
          </div>

          {/* Delete confirm */}
          {deleteStep === 1 && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 ring-1 ring-rose-100">
              <div className="mb-2 flex items-center gap-2 text-rose-900 font-semibold">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                ยืนยันการลบผู้ใช้
              </div>
              <div className="text-sm text-rose-800">
                คุณต้องการลบผู้ใช้ <b>{displayName}</b> ใช่หรือไม่?
                การลบอาจกระทบข้อมูลที่ผูกอยู่ (เช่น การจอง)
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteStep(0)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={doDelete}
                  disabled={delBusy}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                >
                  {delBusy ? "กำลังลบ..." : "ลบผู้ใช้"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

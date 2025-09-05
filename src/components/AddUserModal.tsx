/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faTriangleExclamation, faCircleCheck, faXmark } from "@fortawesome/free-solid-svg-icons";

export type Role = "admin" | "staff" | "customer";

export type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  created_at?: string | null;
};

export default function AddUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (u: AppUser) => void;
}) {
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    role: Role;
    password: string;
  }>({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    password: "",
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    // ต้องมี name, email(ถ้าใส่ต้องรูปแบบถูก), password >= 6
    if (!form.name.trim()) return false;
    if (!form.password || form.password.length < 6) return false;
    const email = form.email.trim();
    if (!email) return false; // ต้องมีอีเมลอย่างน้อยหนึ่งช่องทาง
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    return true;
  }, [form]);

  if (!open) return null;

  const resetState = () => {
    setForm({ name: "", email: "", phone: "", role: "staff", password: "" });
    setErr(null);
    setMsg(null);
  };

  const handleClose = () => {
    if (busy) return;
    resetState();
    onClose();
  };

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          password: form.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "ไม่สามารถสร้างผู้ใช้ได้");

      setMsg("สร้างผู้ใช้สำเร็จ");
      onCreated?.(json.data as AppUser);
      // ปิดโมดัลหลังสำเร็จเล็กน้อย
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button aria-label="close-backdrop" className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                <FontAwesomeIcon icon={faUserPlus} />
                เพิ่มผู้ใช้ใหม่
              </div>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">กรอกข้อมูลผู้ใช้</h3>
              <p className="mt-1 text-xs text-gray-600">กรุณากรอกข้อมูลให้ถูกต้อง โดยระบบจะเพิ่ม <code>users</code> ใน Auth ให้โดยอัตโนมัติ</p>
            </div>
            <button
              onClick={handleClose}
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
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
                <span>{err}</span>
              </div>
            )}
            {msg && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5" />
                <span>{msg}</span>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-600">ชื่อ <span className="text-rose-600">*</span></label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">อีเมล <span className="text-rose-600">*</span></label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
                type="email"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">เบอร์โทร (ไม่บังคับ)</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="08x-xxx-xxxx"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-600">บทบาท</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600">รหัสผ่านเริ่มต้น <span className="text-rose-600">*</span></label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  type="password"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-6 py-3">
          <button
            onClick={handleClose}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            disabled={busy}
          >
            ยกเลิก
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "กำลังบันทึก…" : "สร้างผู้ใช้"}
          </button>
        </div>
      </div>
    </div>
  );
}

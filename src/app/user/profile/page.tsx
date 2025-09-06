/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
};

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [user, setUser] = useState<UserRow | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // โหลดข้อมูลโปรไฟล์ผู้ใช้
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setMsg(null);

      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authRes?.user) {
        router.replace("/auth/login");
        return;
      }

      const uid = authRes.user.id;

      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, phone")
        .eq("id", uid)
        .single();

      if (error) {
        setErr(error.message);
      } else {
        const row = (data ?? null) as UserRow | null;
        setUser(row);
        setName(row?.name ?? "");
        setPhone(row?.phone ?? "");
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (name ?? "") !== (user.name ?? "") || (phone ?? "") !== (user.phone ?? "");
  }, [name, phone, user]);

  const phoneInvalid = useMemo(() => {
    if (!phone.trim()) return false;
    return !/^\+?\d{9,15}$/.test(phone.trim());
  }, [phone]);

  async function onSave() {
    if (!user) return;
    if (phoneInvalid) {
      setErr("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ควรเป็นตัวเลข 9–15 หลัก, ใส่ + ได้)");
      return;
    }
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const payload: Partial<UserRow> = {
        name: name.trim(),
        phone: phone.trim() || null, 
      };

      const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", user.id)
        .select("id, email, name, phone")
        .single();

      if (error) throw error;

      setUser(data as UserRow);
      setMsg("บันทึกข้อมูลสำเร็จ");
    } catch (e: any) {
      setErr(e?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            โปรไฟล์ผู้ใช้
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            ข้อมูลส่วนตัว
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            แก้ไขชื่อและเบอร์โทรศัพท์ของคุณ <span className="text-red-600">ไม่สามารถแก้ไขอีเมลได้</span>
          </p>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-16 rounded-2xl border border-indigo-100 bg-indigo-50/40 animate-pulse" />
          <div className="h-16 rounded-2xl border border-indigo-100 bg-indigo-50/40 animate-pulse" />
          <div className="h-16 rounded-2xl border border-indigo-100 bg-indigo-50/40 animate-pulse" />
        </div>
      )}

      {!loading && (
        <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
          {/* แจ้งเตือนสถานะ */}
          {(err || msg) && (
            <div className="px-5 pt-5">
              {err && (
                <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-700">
                  {err}
                </div>
              )}
              {msg && (
                <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700">
                  {msg}
                </div>
              )}
            </div>
          )}

          {/* ฟอร์ม */}
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {/* Email (read-only) */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-600">อีเมล (ใช้เข้าสู่ระบบ)</label>
              <input
                type="email"
                value={user?.email ?? "-"}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700"
              />
            </div>

            {/* Name */}
            <div>
              <label className="mb-1 block text-sm text-gray-700">ชื่อ-นามสกุล</label>
              <input
                type="text"
                placeholder="เช่น สมชาย ใจดี"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm text-gray-700">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="เช่น 0812345678 หรือ +66812345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={[
                  "w-full rounded-xl border px-3 py-2 outline-none transition focus:ring-2",
                  phoneInvalid
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200"
                    : "border-indigo-200 focus:border-indigo-400 focus:ring-indigo-200",
                ].join(" ")}
              />
              {phoneInvalid && (
                <p className="mt-1 text-xs text-rose-600">
                  รูปแบบเบอร์ไม่ถูกต้อง (ต้องเป็นตัวเลข 9–15 หลัก และอาจเริ่มด้วย + ได้)
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-indigo-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              เคล็ดลับ: หากต้องการเปลี่ยนอีเมล/รหัสผ่าน ให้ติดต่อผ่านพนักงาน
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!user) return;
                  setName(user.name ?? "");
                  setPhone(user.phone ?? "");
                  setErr(null);
                  setMsg(null);
                }}
                disabled={!dirty || saving}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                คืนค่าเดิม
              </button>
              <button
                onClick={onSave}
                disabled={!dirty || saving || phoneInvalid}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

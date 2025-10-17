/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import type { UserRow } from "@/types/userrow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-regular-svg-icons/faUser";

type UserRowExt = UserRow & {
  line_user_id?: string | null;
};

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const qs = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [user, setUser] = useState<UserRowExt | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // flags หลัง redirect จาก LINE
  useEffect(() => {
    const linked = qs.get("line_linked");
    const unlinked = qs.get("line_unlinked");
    const error = qs.get("error");
    if (linked === "1") setMsg("เชื่อมต่อ LINE สำเร็จ");
    if (unlinked === "1") setMsg("ยกเลิกเชื่อมต่อ LINE สำเร็จ");
    if (error) setErr(decodeURIComponent(error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  useEffect(() => {
    if (!err && !msg) return;
    const t = setTimeout(() => {
      setErr(null);
      setMsg(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [err, msg]);
  
  // โหลดโปรไฟล์ + สถานะ LINE (อ่านจาก line_links)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setMsg((m) => m);

      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authRes?.user) {
        router.replace("/auth/login");
        return;
      }
      const uid = authRes.user.id;

      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id, email, name, phone")
        .eq("id", uid)
        .single();
      if (userErr) {
        setErr(userErr.message);
        setLoading(false);
        return;
      }

      const { data: linkRow } = await supabase
        .from("line_links")
        .select("line_user_id")
        .eq("user_id", uid)
        .maybeSingle();

      const row = {
        ...(userRow ?? {}),
        line_user_id: linkRow?.line_user_id ?? null,
      } as UserRowExt;

      setUser(row);
      setName(row?.name ?? "");
      setPhone(row?.phone ?? "");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      (name ?? "") !== (user.name ?? "") || (phone ?? "") !== (user.phone ?? "")
    );
  }, [name, phone, user]);

  const phoneInvalid = useMemo(() => {
    if (!phone.trim()) return false;
    return !/^\+?\d{9,15}$/.test(phone.trim());
  }, [phone]);

  async function onSave() {
    if (!user) return;
    if (phoneInvalid) {
      setErr(
        "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ควรเป็นตัวเลข 9–15 หลัก, ใส่ + ได้)"
      );
      return;
    }
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const payload: Partial<UserRowExt> = {
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

      const { data: linkRow } = await supabase
        .from("line_links")
        .select("line_user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setUser({
        ...(data as any),
        line_user_id: linkRow?.line_user_id ?? null,
      });
      setMsg("บันทึกข้อมูลสำเร็จ");
    } catch (e: any) {
      setErr(e?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  // เชื่อมต่อ LINE
  function linkLine() {
    setErr(null);
    setMsg(null);

    const url = "/user/line/link";
    if (typeof window !== "undefined") {
      window.location.assign(url);
    } else {
      router.push(url);
    }
  }

  function cancelUnlink() {
    setShowConfirm(false);
  }
  async function confirmUnlink() {
    setShowConfirm(false);
    await unlinkLine();
  }
  // ยกเลิกเชื่อมต่อ LINE
  async function unlinkLine() {
    if (!user) return;

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch("/api/line/unlink", { method: "POST" });
      if (!res.ok) {
        let detail = "";
        try {
          const j = await res.json();
          detail = j?.error || "";
        } catch {
          /* ignore */
        }
        throw new Error(detail || "ยกเลิกเชื่อมต่อ LINE ไม่สำเร็จ");
      }

      // รีเฟรชข้อมูล
      const { data: userRow, error } = await supabase
        .from("users")
        .select("id, email, name, phone")
        .eq("id", user.id)
        .single();
      if (error) throw error;

      const { data: linkRow } = await supabase
        .from("line_links")
        .select("line_user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setUser({
        ...(userRow as any),
        line_user_id: linkRow?.line_user_id ?? null,
      });
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href);
        u.searchParams.set("line_unlinked", "1");
        u.searchParams.delete("error");
        router.replace(`${u.pathname}?${u.searchParams.toString()}`);
        router.refresh();
      }
    } catch (e: any) {
      setErr(e?.message || "ยกเลิกเชื่อมต่อ LINE ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }
  const lineLinked = !!user?.line_user_id;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <FontAwesomeIcon icon={faUser} />
            Profile
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            ข้อมูลส่วนตัว
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            แก้ไขชื่อและเบอร์โทรศัพท์ของคุณ{" "}
            <span className="text-red-600">ไม่สามารถแก้ไขอีเมลได้</span>
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
        <>
          {/* การ์ดโปรไฟล์ */}
          <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
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

            <div className="grid gap-4 p-5 md:grid-cols-2">
              {/* Email (read-only) */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-600">
                  อีเมล (ใช้เข้าสู่ระบบ)
                </label>
                <input
                  type="email"
                  value={user?.email ?? "-"}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700"
                />
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  ชื่อ-นามสกุล
                </label>
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
                <label className="mb-1 block text-sm text-gray-700">
                  เบอร์โทรศัพท์
                </label>
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
                    รูปแบบเบอร์ไม่ถูกต้อง (ต้องเป็นตัวเลข 9–15 หลัก
                    และอาจเริ่มด้วย + ได้)
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

          {/* บล็อคการเชื่อมต่อ LINE (ย้ายลงมาข้างล่าง) */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white/80 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
              LINE
            </div>

            {/* Connected / Not connected */}
            {lineLinked ? (
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#06C755] text-white">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M19.5 10.8c0 3.59-3.96 6.5-7.5 6.5-.88 0-1.7-.12-2.49-.34-.22-.06-.45.04-.57.25l-.67 1.16c-.14.25-.46.33-.71.19-.12-.07-.2-.18-.23-.32l-.29-1.46c-.03-.16-.15-.29-.3-.35C4.2 15.6 3 13.33 3 10.8 3 7.17 6.73 4.5 12 4.5s7.5 2.67 7.5 6.3Z"
                      />
                    </svg>
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      เชื่อมต่อแล้ว
                    </div>
                    <div className="text-xs text-gray-500">
                      linked:{" "}
                      <span className="font-mono">
                        {user?.line_user_id?.slice(0, 12)}…
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={saving}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="Unlink LINE"
                  aria-label="Unlink LINE"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path fill="currentColor" d="M6 12.75h12v-1.5H6z" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="px-5 py-4">
                <button
                  onClick={linkLine}
                  disabled={saving}
                  className="inline-flex items-center gap-3 rounded-xl bg-[#06C755] px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-[#06C755]/20 hover:opacity-95 disabled:opacity-50"
                  title="Connect LINE"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M19.5 10.8c0 3.59-3.96 6.5-7.5 6.5-.88 0-1.7-.12-2.49-.34-.22-.06-.45.04-.57.25l-.67 1.16c-.14.25-.46.33-.71.19-.12-.07-.2-.18-.23-.32l-.29-1.46c-.03-.16-.15-.29-.3-.35C4.2 15.6 3 13.33 3 10.8 3 7.17 6.73 4.5 12 4.5s7.5 2.67 7.5 6.3Z"
                      />
                    </svg>
                  </span>
                  Connect LINE
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M11.25 5.25v5.5h-5.5v1.5h5.5v5.5h1.5v-5.5h5.5v-1.5h-5.5v-5.5z"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={cancelUnlink}
          />
          {/* dialog */}
          <div className="relative z-[61] w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="p-5">
              <h3 className="text-base font-semibold text-gray-900">
                ยืนยันการยกเลิกเชื่อมต่อ LINE?
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                หลังจากยกเลิก คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE
                จนกว่าจะเชื่อมต่อใหม่
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4">
              <button
                onClick={cancelUnlink}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmUnlink}
                disabled={saving}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

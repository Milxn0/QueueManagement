/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";
import type { AppSettings } from "@/types/appsetting";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      // เช็คสิทธิ์
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures.user?.id;
      if (!uid) {
        setErr("กรุณาเข้าสู่ระบบก่อน");
        setLoading(false);
        return;
      }
      const { data: me, error: meErr } = await supabase
        .from("users")
        .select("role")
        .eq("id", uid)
        .single();
      if (meErr) {
        setErr(meErr.message);
        setLoading(false);
        return;
      }
      setRole(me?.role ?? null);
      if (!["admin", "manager"].includes(me?.role ?? "")) {
        setErr("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องเป็น admin หรือ manager)");
        setLoading(false);
        return;
      }

      // โหลด settings
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      // default
      const def: AppSettings = {
        id: 1,
        is_system_open: true,
        open_time: "13:00",
        close_time: "20:30",
        days_ahead: 30,
        store_name: "SEOUL BBQ",
        store_image_url:
          "https://xrxnwricckxzuhswoasc.supabase.co/storage/v1/object/public/public/store/main_1757518439926_38opvx.jpg",
        contact_phone: "074-239-246",
        contact_ig:
          "https://www.instagram.com/seoulkoreanbbq_hatyai?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
        contact_facebook: "https://www.facebook.com/koreanbbqhatyai",
        menu_url: "",
      };

      setSettings((data as AppSettings) ?? def);
      setLoading(false);
    })();
  }, [supabase]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      // บังคับ id=1
      const payload = { ...settings, id: 1 };
      const { error } = await supabase.from("app_settings").upsert(payload, {
        onConflict: "id",
      });
      if (error) throw error;
      setOk("บันทึกการตั้งค่าสำเร็จ");
      setTimeout(() => setOk(null), 1800);
    } catch (e: any) {
      setErr(e?.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-40 bg-gray-200 animate-pulse rounded" />
      </main>
    );
  }

  if (err) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
          {err}
        </div>
        <div className="mt-4">
          <Link href="/" className="text-indigo-600 hover:underline">
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <FontAwesomeIcon icon={faGear} />
            Settings
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            การตั้งค่าระบบจอง & ข้อมูลร้าน
          </h1>
          <p className="mt-1 text-sm text-gray-600">เข้าถึงได้เฉพาะ Admin</p>
        </div>
      </div>

      {ok && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {ok}
        </div>
      )}

      {/* System controls */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">ระบบจองคิว</h2>
          <p className="text-xs text-gray-500 mt-1">
            กรุณากรอกข้อมูลให้ถูกต้อง ก่อนกดยืนยัน
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* is_system_open */}
          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <div>
              <div className="text-sm font-medium text-gray-800">
                เปิดระบบจอง
              </div>
              <div className="text-xs text-red-500">
                * ปิดระบบในกรณีที่จำเป็นเท่านั้น
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={!!settings?.is_system_open}
                onChange={(e) =>
                  setSettings(
                    (s) => s && { ...s, is_system_open: e.target.checked }
                  )
                }
              />
              <span className="h-6 w-10 rounded-full bg-gray-200 peer-checked:bg-indigo-600 transition relative">
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
              </span>
            </label>
          </div>

          {/* days ahead */}
          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              จองล่วงหน้า (วัน)
            </label>
            <input
              type="number"
              min={0}
              max={365}
              value={settings?.days_ahead ?? 0}
              onChange={(e) =>
                setSettings(
                  (s) =>
                    s && {
                      ...s,
                      days_ahead: Math.max(0, Number(e.target.value || 0)),
                    }
                )
              }
              className="mt-1 w-40 rounded-lg border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              จำกัดกรอบสูงสุดของวันที่จองล่วงหน้าได้
            </p>
          </div>

          {/* open/close time */}
          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              เวลาเปิดรับจอง (รายวัน)
            </label>
            <input
              type="time"
              value={settings?.open_time ?? "09:00"}
              onChange={(e) =>
                setSettings(
                  (s) => s && { ...s, open_time: e.target.value || "09:00" }
                )
              }
              className="mt-1 w-40 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              เวลาปิดรับจอง (รายวัน)
            </label>
            <input
              type="time"
              value={settings?.close_time ?? "21:00"}
              onChange={(e) =>
                setSettings(
                  (s) => s && { ...s, close_time: e.target.value || "21:00" }
                )
              }
              className="mt-1 w-40 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Store info */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">ข้อมูลร้าน</h2>
          <p className="text-xs text-gray-500 mt-1">
            กรุณากรอกข้อมูลให้ถูกต้อง ก่อนกดยืนยัน
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              ชื่อร้าน
            </label>
            <input
              type="text"
              value={settings?.store_name ?? ""}
              onChange={(e) =>
                setSettings((s) => s && { ...s, store_name: e.target.value })
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="เช่น No.1 BBQ"
            />
          </div>

          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              รูปภาพหลัก
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const BUCKET = "public";
                const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
                const rand = Math.random().toString(36).slice(2, 8);
                const filePath = `store/main_${Date.now()}_${rand}.${ext}`;

                const { error: upErr } = await supabase.storage
                  .from(BUCKET)
                  .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type,
                  });
                if (upErr) {
                  alert("อัปโหลดไม่สำเร็จ: " + upErr.message);
                  return;
                }

                const { data } = supabase.storage
                  .from(BUCKET)
                  .getPublicUrl(filePath);
                const publicUrl = data.publicUrl;
                setSettings((s) => s && { ...s, store_image_url: publicUrl });

                const { error: dbErr } = await supabase
                  .from("app_settings")
                  .upsert(
                    {
                      id: 1,
                      store_image_url: publicUrl,
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "id" }
                  );

                if (dbErr) {
                  alert("บันทึก URL ลงตารางไม่สำเร็จ: " + dbErr.message);
                }
              }}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="mt-2 text-xs text-red-500">*รองรับแค่ JPG/PNG/WebP</p>
          </div>

          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              เบอร์โทรติดต่อ
            </label>
            <input
              type="tel"
              value={settings?.contact_phone ?? ""}
              onChange={(e) =>
                setSettings((s) => s && { ...s, contact_phone: e.target.value })
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              Instagram
            </label>
            <input
              type="text"
              value={settings?.contact_ig ?? ""}
              onChange={(e) =>
                setSettings((s) => s && { ...s, contact_ig: e.target.value })
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Instagram URL"
            />
            <p className="mt-2 text-xs text-red-500">*รองรับแค่ URL เท่านั้น</p>
          </div>

          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              Facebook
            </label>
            <input
              type="url"
              value={settings?.contact_facebook ?? ""}
              onChange={(e) =>
                setSettings(
                  (s) => s && { ...s, contact_facebook: e.target.value }
                )
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Facebook URL"
            />
            <p className="mt-2 text-xs text-red-500">*รองรับแค่ URL เท่านั้น</p>
          </div>

          <div className="rounded-xl border px-4 py-3">
            <label className="block text-sm font-medium text-gray-800">
              เมนู (ไฟล์ภาพ/PDF)
            </label>
            <input
              type="url"
              value={settings?.menu_url ?? ""}
              onChange={(e) =>
                setSettings((s) => s && { ...s, menu_url: e.target.value })
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="(รูป/ PDF ของเมนู)"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faFloppyDisk} />{" "}
            {saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
          </button>
        </div>
      </section>
    </main>
  );
}

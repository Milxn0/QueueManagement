/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

function parseHashParams() {
  const raw = typeof window !== "undefined" ? window.location.hash : "";
  const q = new URLSearchParams(raw.replace(/^#/, ""));
  return {
    access_token: q.get("access_token"),
    refresh_token: q.get("refresh_token"),
    type: q.get("type"),
    error: q.get("error"),
    error_description: q.get("error_description"),
  };
}

export default function ResetPasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
      } catch {
      }

      let { data } = await supabase.auth.getSession();

      if (!data.session) {
        const sp = new URLSearchParams(window.location.search);
        const token_hash = sp.get("token_hash");
        const type = sp.get("type");
        if (token_hash && type === "recovery") {
          try {
            const { data: vData, error } = await supabase.auth.verifyOtp({
              type: "recovery",
              token_hash,
            } as any);

            if (error) setErr(error.message);

            if (vData?.session) {
              const { error: setErr2 } = await supabase.auth.setSession({
                access_token: vData.session.access_token,
                refresh_token: vData.session.refresh_token,
              });
              if (setErr2) setErr(setErr2.message);
            }
          } catch (e: any) {
            setErr(e?.message ?? "ยืนยันลิงก์ไม่สำเร็จ");
          }
        }
      }

      data = (await supabase.auth.getSession()).data;
      if (!data.session) {
        const h = parseHashParams();
        if (h.access_token && h.refresh_token && h.type === "recovery") {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: h.access_token,
              refresh_token: h.refresh_token,
            });
            if (error) setErr(error.message);
          } catch (e: any) {
            setErr(e?.message ?? "ตั้งค่า session ไม่สำเร็จ");
          }
        } else if (h.error || h.error_description) {
          setErr(h.error_description ?? h.error ?? "ลิงก์ไม่ถูกต้อง");
        }
      }

      if (window.location.search || window.location.hash) {
        const clean = window.location.origin + window.location.pathname;
        window.history.replaceState({}, "", clean);
      }

      const final = (await supabase.auth.getSession()).data;
      if (mounted && !final.session && !err) {
        setErr("ลิงก์หมดอายุ หรือไม่พบ session กรุณากลับไปขอลิงก์ใหม่");
      }
      if (mounted) setChecking(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]); // eslint-disable-line

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (password.length < 8) return setErr("รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร");
    if (password !== password2) return setErr("รหัสผ่านทั้งสองช่องไม่ตรงกัน");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setErr(error.message);
    setOk(true);
  };

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
        <p className="mt-2 text-sm text-gray-600">
          ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ
        </p>

        {checking ? (
          <div className="mt-4 text-sm text-gray-600">กำลังตรวจสอบลิงก์…</div>
        ) : ok ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            ตั้งรหัสผ่านสำเร็จ! คุณสามารถปิดหน้านี้แล้วเข้าสู่ระบบใหม่ได้เลย
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm text-gray-700">รหัสผ่านใหม่</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">ยืนยันรหัสผ่านใหม่</span>
              <input
                type="password"
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>

            {err && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
                {err}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow hover:bg-indigo-700"
            >
              เปลี่ยนรหัสผ่าน
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

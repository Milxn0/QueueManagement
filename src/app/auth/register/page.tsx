/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    if (password !== confirm) {
      setErr("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // upsert แถวใน public.users (ถ้าทำได้)
      const { data: u } = await supabase.auth.getUser();
      if (u?.user?.id) {
        await supabase.from("users").upsert({
          id: u.user.id,
          email,
          role: "customer",
        });
      }

      router.replace("/");
      return;
    } catch (e: any) {
      setErr(e?.message ?? "สมัครสมาชิกไม่สำเร็จ");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">สมัครสมาชิก</h1>
      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">ยืนยันรหัสผ่าน</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 text-white py-2.5 hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-4">
        มีบัญชีแล้ว? <a href="/auth/login" className="text-indigo-600 underline">เข้าสู่ระบบ</a>
      </p>
    </main>
  );
}

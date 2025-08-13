/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    // 1) เข้าสู่ระบบ
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    try {
      // 2) ดึง user id จาก auth
      const userId =
        signInData.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        setErr("ไม่พบข้อมูลผู้ใช้หลังเข้าสู่ระบบ");
        return;
      }

      // 3) ตรวจ role จาก public.users
      const { data: profile, error: profileErr } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileErr) {
        // ถ้ายังไม่มีแถวใน public.users ก็ปล่อยผ่านไปหน้าแรก
        router.push("/");
        router.refresh();
        return;
      }

      // 4) route ตาม role
      if (profile?.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาดขณะตรวจสอบสิทธิ์ผู้ใช้");
    }
  };

  return (
    <main className="max-w-md mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">เข้าสู่ระบบ</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">อีเมล</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">รหัสผ่าน</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="••••••••"
          />
        </div>

        {err && <p className="text-red-600 text-sm">{err}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 text-white py-2.5 hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-4">
        ยังไม่มีบัญชี?{" "}
        <a href="/auth/register" className="text-indigo-600 underline">
          สมัครสมาชิก
        </a>
      </p>
    </main>
  );
}

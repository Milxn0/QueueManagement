/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
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

    router.prefetch("/admin/dashboard");
    router.prefetch("/");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      setErr(error.message);
      return;
    }

    const userId = data.user?.id!;
    const { data: p } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    try {
      await fetch("/api/audit/log-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
    } catch {}

    setLoading(false);
    if (p?.role === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/");
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
      <p className="text-sm text-gray-600 mt-4">
        หากลืมรหัสผ่าน{" "}
        <a href="/auth/forgot" className="text-indigo-600 underline">
          Forgot Password
        </a>
      </p>
    </main>
  );
}

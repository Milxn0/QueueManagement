/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
"use client";
import { useState, useEffect } from "react";
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

    // ถ้ามีพารามิเตอร์ ?next=... ให้เด้งกลับไปหน้านั้นก่อน
    const sp = new URLSearchParams(window.location.search);
    const next = sp.get("next");
    const safeNext = next && next.startsWith("/") ? next : null;

    setLoading(false);
    if (safeNext) {
      router.replace(safeNext);
      return;
    }
    if (p?.role === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/");
    }
  };
  async function loginWithGoogle() {
    setErr(null);
    setLoading(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const safeNext = getSafeNext();
      const redirectTo = `${origin}/auth/login${
        safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""
      }`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (e: any) {
      setErr(e?.message || "ไม่สามารถเข้าสู่ระบบด้วย Google ได้");
      setLoading(false);
    }
  }
  function getSafeNext() {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    const next = sp.get("next");
    return next && next.startsWith("/") ? next : null;
  }

  async function routeAfterLogin(
    supabase: ReturnType<typeof createClient>,
    router: ReturnType<typeof useRouter>
  ) {
    const safeNext = getSafeNext();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const userId = data.user.id;
    const { data: p } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (safeNext) {
      router.replace(safeNext);
      return;
    }
    if (p?.role === "admin") router.replace("/admin/dashboard");
    else router.replace("/");
  }

  useEffect(() => {
    routeAfterLogin(supabase, router);
  }, []);
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
      {/* ---- bottom social login ---- */}
      <div className="mt-8">
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          <span className="text-xs uppercase tracking-wider text-gray-500">
            หรือ
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-transparent" />
        </div>
        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-2.5 hover:bg-gray-50 disabled:opacity-60"
          aria-label="Sign in with Google"
        >
          {/* Google mark (SVG) */}
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.957,3.043l5.657-5.657C34.046,6.053,29.268,4,24,4C12.954,4,4,12.954,4,24 s8.954,20,20,20s20-8.954,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.306,14.691l6.571,4.818C14.297,16.108,18.777,14,24,14c3.059,0,5.842,1.154,7.957,3.043l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.198,0-9.607-3.317-11.271-7.949l-6.5,5.02C9.539,39.556,16.227,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.239-2.231,4.166-3.994,5.57l6.19,5.238 C35.212,39.069,44,33.5,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          <span className="font-medium">Continue with Google</span>
        </button>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LineLinkPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const token = sp.get("token") || "";
  const sig = sp.get("sig") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);

  const currentUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/user/line/link?token=${encodeURIComponent(
      token
    )}&sig=${encodeURIComponent(sig)}`;
  }, [token, sig]);

  useEffect(() => {
    (async () => {
      if (!token || !sig) {
        setErr("ลิงก์ไม่ถูกต้อง");
        setLoading(false);
        return;
      }

      // 1) ต้องล็อกอินก่อน — ถ้ายัง ให้ส่งไปหน้า login พร้อม next=currentUrl
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace(`/auth/login?next=${encodeURIComponent(currentUrl)}`);
        return;
      }

      // 2) login แล้ว ถึงค่อย "ขอ OTP" — จะไม่เผลอ mark ลิงก์ก่อนคน login
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/line/issue-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, sig }),
          cache: "no-store",
          credentials: "include",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(body?.error || "ลิงก์ไม่ถูกต้องหรือหมดอายุ");
          setLoading(false);
          return;
        }
        setOtp(body.code || null); 
      } catch (e) {
        setErr("เกิดข้อผิดพลาด กรุณาลองใหม่");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, sig, currentUrl, router, supabase]);

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold">ยืนยันตัวตนเพื่อเชื่อมกับ LINE</h1>
      {loading && <p className="mt-3 text-gray-500">กำลังออก OTP ...</p>}
      {!loading && err && <p className="mt-3 text-red-600">{err}</p>}
      {!loading && !err && otp && (
        <div className="mt-4 rounded-lg border p-4 bg-green-50">
          <div className="text-sm text-gray-700">รหัส OTP ของคุณ</div>
          <div className="mt-1 text-2xl font-mono tracking-widest">{otp}</div>
          <p className="mt-2 text-sm text-gray-600">
            กรุณากลับไปที่แชท LINE และพิมพ์รหัสนี้เพื่อยืนยันตัวตน
          </p>
        </div>
      )}
    </main>
  );
}

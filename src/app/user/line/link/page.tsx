"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

const LINE_ADD_FRIEND_URL =
  process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || ""; 
const LINE_OPEN_CHAT_URL =
  process.env.NEXT_PUBLIC_LINE_OPEN_CHAT_URL || ""; 

export default function LineLinkPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const token = sp.get("token") || "";
  const sig = sp.get("sig") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/user/line/link?token=${encodeURIComponent(
      token
    )}&sig=${encodeURIComponent(sig)}`;
  }, [token, sig]);

  // countdown
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remainingMs = useMemo(() => {
    if (!expiresAt) return 0;
    return Math.max(0, new Date(expiresAt).getTime() - now);
  }, [expiresAt, now]);
  const mmss = useMemo(() => {
    const s = Math.floor(remainingMs / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [remainingMs]);

  useEffect(() => {
    (async () => {
      // ไม่มี token/sig ให้แสดงวิธีเริ่มต้นแทน error
      if (!token || !sig) {
        setLoading(false);
        setErr(null);
        return;
      }

      // ต้องล็อกอินก่อน
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace(`/auth/login?next=${encodeURIComponent(currentUrl)}`);
        return;
      }

      // ขอ OTP
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
        // หมดอายุฝั่งหน้าเว็บ 5 นาที
        setExpiresAt(new Date(Date.now() + 5 * 60 * 1000).toISOString());
      } catch {
        setErr("เกิดข้อผิดพลาด กรุณาลองใหม่");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, sig, currentUrl, router, supabase]);

  async function copyOtp() {
    if (!otp) return;
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
        <div className="p-5 border-b border-indigo-100">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            ยืนยันตัวตนเพื่อเชื่อมกับ LINE
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            รับรหัส OTP 6 หลัก แล้วส่งรหัสดังกล่าวในแชท LINE ของร้าน
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* กรณีไม่มี token/sig: แสดงวิธีเริ่ม */}
          {!token || !sig ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <p className="font-medium">วิธีเริ่มการเชื่อมต่อ</p>
              <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm">
                <li>
                  เพิ่มเพื่อน LINE ของร้าน{" "}
                  {LINE_ADD_FRIEND_URL ? (
                    <a
                      href={LINE_ADD_FRIEND_URL}
                      className="text-indigo-600 underline"
                      target="_blank"
                    >
                      คลิกที่นี่
                    </a>
                  ) : (
                    "(สแกน/กดลิงก์ของร้าน)"
                  )}
                </li>
                <li>
                  พิมพ์ <span className="font-mono">Queue Code</span> ของคุณในแชท
                </li>
                <li>กดปุ่ม “ยืนยัน/ล็อกอิน” ที่บอทส่งมาเพื่อกลับมาหน้านี้</li>
              </ol>
              <div className="mt-3">
                {LINE_OPEN_CHAT_URL && (
                  <a
                    href={LINE_OPEN_CHAT_URL}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
                    target="_blank"
                  >
                    เปิด LINE
                  </a>
                )}
              </div>
            </div>
          ) : null}

          {loading && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-800">
              กำลังออก OTP …
            </div>
          )}

          {!loading && err && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-700">
              {err}
            </div>
          )}

          {!loading && !err && otp && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">OTP ของคุณ</p>
                <div className="mt-1 select-all font-mono text-4xl font-semibold tracking-widest text-emerald-900">
                  {otp}
                </div>
                <p className="mt-1 text-xs text-emerald-700">
                  หมดอายุใน {mmss}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={copyOtp}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {copied ? "คัดลอกแล้ว" : "คัดลอก OTP"}
                  </button>
                  {LINE_OPEN_CHAT_URL && (
                    <a
                      href={LINE_OPEN_CHAT_URL}
                      target="_blank"
                      className="rounded-lg bg-[#06C755] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                    >
                      เปิด LINE แล้ววาง OTP
                    </a>
                  )}
                </div>
              </div>

              {remainingMs === 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
                  OTP หมดอายุแล้ว กรุณากลับไปที่แชท LINE แล้วกดลิงก์ยืนยันใหม่อีกครั้ง
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => router.replace("/user/profile?line_linked=1")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              กลับไปหน้าโปรไฟล์
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

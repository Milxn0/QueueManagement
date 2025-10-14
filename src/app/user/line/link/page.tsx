"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LineLinkPage() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const sig = sp.get("sig") ?? "";

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [status, setStatus] =
    useState<"checking" | "need-login" | "issuing" | "done" | "error">(
      "checking"
    );
  const [otp, setOtp] = useState<string>("");

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStatus("need-login");
        return;
      }
      setStatus("issuing");
      const res = await fetch("/api/line/issue-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sig }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const json = await res.json();
      setOtp(json.code);
      setStatus("done");
    })();
  }, [supabase, token, sig]);

  if (status === "checking")
    return <div className="p-6 text-lg">กำลังตรวจสอบ…</div>;

  if (status === "need-login")
    return (
      <div className="p-6 space-y-2">
        <div className="text-xl font-semibold">กรุณาเข้าสู่ระบบก่อน</div>
        <p>หลังเข้าสู่ระบบ หน้าเว็บนี้จะออก OTP ให้คุณอัตโนมัติ</p>
        <a href="/auth/login" className="underline">
          ไปหน้าเข้าสู่ระบบ
        </a>
      </div>
    );

  if (status === "issuing")
    return <div className="p-6 text-lg">กำลังออก OTP…</div>;

  if (status === "error")
    return <div className="p-6 text-rose-600">ลิงก์ไม่ถูกต้องหรือหมดอายุ</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="text-xl font-semibold">OTP ของคุณ</div>
      <div className="text-4xl font-bold tracking-widest">{otp}</div>
      <p className="text-sm text-gray-500">
        กลับไปที่ LINE แล้วส่งเลขนี้ในแชทภายใน 5 นาที
      </p>
    </div>
  );
}

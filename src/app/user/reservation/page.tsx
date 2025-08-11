"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

type Step = 1 | 2;

export default function ReservationPage() {
  const supabase = createClient();

  // auth
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // stepper
  const [step, setStep] = useState<Step>(1);

  // form data (step 1)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); // เผื่ออยากเก็บไว้ติดต่อ
  const [partySize, setPartySize] = useState<number>(1);
  const [dateTime, setDateTime] = useState<string>("");

  // otp (step 2)
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState<string | null>(null); // โชว์เฉพาะโหมดเดโม
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user;
      setIsLoggedIn(!!user);

      // เติมอีเมลจาก auth.users ถ้ามี
      if (user?.email) {
        setEmail(user.email);
      }

      setLoading(false);
    };

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsLoggedIn(!!data.user);
      setLoading(false);
    };

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // ---------- helpers ----------
  const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const genQueueCode = () => {
    // โค้ดสั้น อ่านง่าย และมีโอกาสซ้ำต่ำ (ยังมี unique ตรวจซ้ำอีกชั้น)
    const base = Date.now().toString(36).toUpperCase().slice(-6);
    const rand = Math.floor(Math.random() * 36 ** 2)
      .toString(36)
      .toUpperCase()
      .padStart(2, "0");
    return `Q${base}${rand}`;
  };

  const requestOTP = async () => {
    setErr(null);
    setMsg(null);

    if (!fullName.trim()) return setErr("กรุณากรอกชื่อ-นามสกุล");
    if (!phone.trim()) return setErr("กรุณากรอกเบอร์โทรศัพท์");
    if (!dateTime.trim()) return setErr("กรุณาเลือกวันและเวลา");
    if (!partySize || partySize < 1)
      return setErr("กรุณาระบุจำนวนคนให้ถูกต้อง");

    setBusy(true);
    try {
      const code = genOTP();
      // บันทึกลงตาราง public.otp_verifications
      const { error } = await supabase.from("otp_verifications").insert({
        phone,
        otp_code: code,
      });
      if (error) throw error;
      setOtpSent(code); // (เดโม) โปรดซ่อน/ลบเมื่อเชื่อม SMS จริง
      setMsg("ส่งรหัส OTP แล้ว กรุณาตรวจสอบและใส่รหัสยืนยัน");
      setStep(2);
    } catch (e: any) {
      setErr(e?.message || "ไม่สามารถส่งรหัส OTP ได้");
    } finally {
      setBusy(false);
    }
  };

  // สร้าง/ยืนยันแถวผู้ใช้ใน public.users ให้ FK และ RLS ผ่าน
  const ensureProfile = async (authUser: { id: string } | null) => {
    if (!authUser?.id) throw new Error("ไม่พบผู้ใช้ที่ล็อกอิน");
    // มี policy: insert anon allowed, select anyone allowed → ใช้ได้
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .limit(1);
    if (error) throw error;

    if (!data || data.length === 0) {
      const { error: insErr } = await supabase.from("users").insert({
        id: authUser.id, // ให้ user_id ใน reservations ผูก FK ได้
        name: fullName || null,
        phone: phone || null,
        role: "customer",
        email: email || null,
      });
      if (insErr) throw insErr;
    } else {
      // จะอัปเดต โทร/ชื่อ/อีเมล ล่าสุดให้ก็ได้ (ขอเบาๆ ไม่บังคับ)
      await supabase
        .from("users")
        .update({
          name: fullName || null,
          phone: phone || null,
          email: email || null,
        })
        .eq("id", authUser.id);
    }

    return authUser.id;
  };

  const insertReservationWithRetries = async (userId: string) => {
    const MAX_RETRY = 5;
    const reservation_datetime = new Date(dateTime).toISOString();

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      const queue_code = genQueueCode();
      const { error } = await supabase.from("reservations").insert({
        user_id: userId, // RLS: auth.uid() ต้องเท่ากับ user_id
        reservation_datetime,
        partysize: partySize,
        queue_code, // มี unique constraint → ถ้าชน ให้สุ่มใหม่แล้วลองอีก
        status: "pending",
      });

      if (!error) {
        return queue_code;
      }

      // ถ้า unique ชน ให้ลองใหม่
      const msg = (error as any)?.message || "";
      const isUnique =
        msg.includes("duplicate key value violates unique constraint") ||
        msg.includes("reservations_queue_code_key");
      if (!isUnique) throw error; // ไม่ใช่เรื่องซ้ำ โยน error เลย

      if (attempt === MAX_RETRY) throw error; // พยายามเต็มที่แล้ว
    }

    throw new Error("ไม่สามารถบันทึกการจองได้ (queue_code ซ้ำหลายครั้ง)");
  };

  const verifyOTP = async () => {
    setErr(null);
    setMsg(null);
    if (!otp.trim()) return setErr("กรุณากรอกรหัส OTP");

    setBusy(true);
    try {
      // ตรวจ OTP ล่าสุด
      const { data, error } = await supabase
        .from("otp_verifications")
        .select("*")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;

      const latest = data?.[0];
      if (!latest) {
        setErr("ไม่พบบันทึกรหัส OTP สำหรับเบอร์นี้");
        return;
      }
      if (latest.otp_code !== otp) {
        setErr("รหัส OTP ไม่ถูกต้อง");
        return;
      }

      // ดึง auth user
      const { data: u } = await supabase.auth.getUser();
      const authUser = u.user;
      if (!authUser) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");

      // ให้แน่ใจว่ามีแถว public.users ตรงกับ auth.uid()
      const publicUserId = await ensureProfile({ id: authUser.id });

      // แทรกการจอง + จัดการ queue_code ซ้ำ
      const code = await insertReservationWithRetries(publicUserId);

      setMsg(
        `ยืนยัน OTP สำเร็จ และบันทึกการจองเรียบร้อย! รหัสคิวของคุณคือ ${code}`
      );
      // จะ redirect ก็ได้ เช่น:
      // router.push("/reservation/success?code="+code)
    } catch (e: any) {
      setErr(e?.message || "ไม่สามารถยืนยันรหัส OTP/บันทึกการจองได้");
    } finally {
      setBusy(false);
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="animate-pulse h-24 w-full bg-gray-200 rounded" />
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-800">
            กรุณาเข้าสู่ระบบก่อน
          </h1>
          <p className="text-sm text-amber-800/80 mt-1">
            เพื่อทำการจองคิว คุณต้องเข้าสู่ระบบก่อน
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/auth/login"
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/auth/register"
              className="rounded-xl border border-indigo-300 px-4 py-2 hover:bg-indigo-50"
            >
              สมัครสมาชิก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">จองคิว</h1>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`flex items-center gap-2 ${
            step === 1 ? "text-indigo-700" : "text-gray-500"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border ${
              step === 1
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white"
            }`}
          >
            1
          </div>
          <span className="text-sm font-medium">กรอกข้อมูล</span>
        </div>
        <div className="h-px flex-1 bg-gray-200" />
        <div
          className={`flex items-center gap-2 ${
            step === 2 ? "text-indigo-700" : "text-gray-500"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border ${
              step === 2
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white"
            }`}
          >
            2
          </div>
          <span className="text-sm font-medium">ยืนยัน OTP</span>
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {msg && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      {/* Step 1: Form */}
      {step === 1 && (
        <section className="rounded-2xl border p-6 space-y-4">
          <div>
            <label className="block text-sm mb-1">ชื่อ-นามสกุล</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="เช่น นัณต์นวัสย์ ชูหลจินดา"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              เบอร์โทรศัพท์ (ใช้รับ OTP)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="เช่น 097xxxxxxx"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">อีเมล (ถ้ามี)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="you@example.com"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">จำนวนคน</label>
              <input
                type="number"
                min={1}
                value={partySize}
                onChange={(e) =>
                  setPartySize(parseInt(e.target.value || "1", 10))
                }
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">วันและเวลา</label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={requestOTP}
              disabled={busy}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "กำลังส่งรหัส..." : "ขอรหัส OTP"}
            </button>
          </div>

          {otpSent && (
            <p className="text-xs text-gray-500">
              (โหมดเดโม) รหัส OTP คือ{" "}
              <span className="font-mono font-semibold">{otpSent}</span> —
              โปรดซ่อน/ลบการแสดงผลนี้เมื่อเชื่อม SMS จริง
            </p>
          )}
        </section>
      )}

      {/* Step 2: Verify OTP + Insert reservation */}
      {step === 2 && (
        <section className="rounded-2xl border p-6 space-y-4">
          <div className="text-sm text-gray-700">
            ส่งรหัสไปที่เบอร์ <b>{phone}</b> — กรอกรหัส 6 หลักเพื่อยืนยัน
            และระบบจะบันทึกการจองให้โดยอัตโนมัติ
          </div>

          <div>
            <label className="block text-sm mb-1">รหัส OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 font-mono tracking-widest"
              placeholder="______"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={verifyOTP}
              disabled={busy}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "กำลังตรวจสอบ..." : "ยืนยัน OTP และจองคิว"}
            </button>

            <button
              onClick={() => setStep(1)}
              className="rounded-xl border px-4 py-2 hover:bg-gray-50"
            >
              แก้ไขข้อมูล
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

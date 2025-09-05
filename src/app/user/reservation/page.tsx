/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { SetStateAction, useEffect, useMemo, useState } from "react";
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
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState<number>(1);
  const [dateTime, setDateTime] = useState<string>("");

  // otp (step 2)
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // ----------auth + autofill profile (email/name/phone) ----------
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const user = data.user;
      setIsLoggedIn(!!user);

      // เติมอีเมลจาก auth (อ่านอย่างเดียว ไม่ให้แก้)
      if (user?.email) setEmail(user.email);

      // ดึงจากตาราง users เพื่อ autofill
      if (user?.id) {
        const { data: prof, error: pErr } = await supabase
          .from("users")
          .select("name, phone")
          .eq("id", user.id)
          .single();

        if (!pErr && prof) {
          if (prof.name && !fullName) setFullName(prof.name);
          if (prof.phone && !phone) setPhone(prof.phone);
        }
      }

      setLoading(false);
    };

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: any, session: { user: { email: SetStateAction<string> } }) => {
        setIsLoggedIn(!!session?.user);
        if (session?.user?.email) setEmail(session.user.email);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // ตรวจสถานะ login ซ้ำ
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsLoggedIn(!!data.user);
      setLoading(false);
    };

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: any, session: { user: any }) => {
        setIsLoggedIn(!!session?.user);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // ---------- OTP GEN ----------
  const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  // ---------- QueueCode GEN ----------
  const genQueueCode = () => {
    const base = Date.now().toString(36).toUpperCase().slice(-6);
    const rand = Math.floor(Math.random() * 36 ** 2)
      .toString(36)
      .toUpperCase()
      .padStart(2, "0");
    return `Q${base}${rand}`;
  };
  // ตรวจว่าจองได้ตาม app_settings หรือไม่
  const validateReservationTime = () => {
    if (!settings) {
      return {
        ok: false as const,
        msg: "ระบบกำลังโหลดการตั้งค่า กรุณาลองใหม่",
      };
    }
    if (settings.is_system_open === false) {
      return { ok: false as const, msg: "ขณะนี้ปิดการรับจองชั่วคราว" };
    }
    if (!dateTime) {
      return { ok: false as const, msg: "กรุณาเลือกวันและเวลา" };
    }

    const d = new Date(dateTime);
    if (Number.isNaN(d.getTime())) {
      return { ok: false as const, msg: "วันและเวลาไม่ถูกต้อง" };
    }

    // ห้ามย้อนหลัง
    const now = new Date();
    if (d.getTime() < now.getTime()) {
      return { ok: false as const, msg: "เลือกวันเวลาในอนาคตเท่านั้น" };
    }

    // จำกัดจำนวนวันล่วงหน้า
    const daysAhead = settings.days_ahead ?? 30;
    const startOf = (x: Date) =>
      new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.floor((startOf(d) - startOf(now)) / 86400000);
    if (diffDays > daysAhead) {
      return {
        ok: false as const,
        msg: `จองล่วงหน้าได้ไม่เกิน ${daysAhead} วัน`,
      };
    }

    // อยู่ในช่วงเวลาเปิด-ปิดรายวัน
    const [oh, om] = (settings.open_time || "09:00").split(":").map(Number);
    const [ch, cm] = (settings.close_time || "21:00").split(":").map(Number);
    const tMin = d.getHours() * 60 + d.getMinutes();
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;

    // รองรับกรณีร้านเปิดข้ามวัน (เช่น 18:00–02:00)
    const within =
      openMin <= closeMin
        ? tMin >= openMin && tMin <= closeMin
        : tMin >= openMin || tMin <= closeMin;

    if (!within) {
      return {
        ok: false as const,
        msg: `เวลาที่เลือกอยู่นอกช่วงรับจอง (${settings.open_time} – ${settings.close_time})`,
      };
    }

    return { ok: true as const };
  };

  const requestOTP = async () => {
    setErr(null);
    setMsg(null);

    // ตรวจฟิลด์บังคับ
    if (!fullName.trim()) throw new Error("กรุณากรอกชื่อ-นามสกุล");
    if (!phone.trim()) throw new Error("กรุณากรอกเบอร์โทรศัพท์");
    if (!dateTime.trim()) throw new Error("กรุณาเลือกวันและเวลา");
    if (!partySize || partySize < 1)
      throw new Error("กรุณาระบุจำนวนคนให้ถูกต้อง");

    // ✅ ตรวจตาม app_settings
    const v = validateReservationTime();
    if (!v.ok) throw new Error(v.msg);

    setBusy(true);
    try {
      const code = genOTP();
      const { error } = await supabase.from("otp_verifications").insert({
        phone,
        otp_code: code,
      });
      if (error) throw error;

      setOtpSent(code);
      setMsg("ส่งรหัส OTP แล้ว กรุณาตรวจสอบและใส่รหัสยืนยัน");
      setStep(2);
    } catch (e: any) {
      // โยนให้ปุ่มไปแสดง Toast
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const ensureProfile = async (authUser: { id: string } | null) => {
    if (!authUser?.id) throw new Error("ไม่พบผู้ใช้ที่ล็อกอิน");
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .limit(1);
    if (error) throw error;

    if (!data || data.length === 0) {
      const { error: insErr } = await supabase.from("users").insert({
        id: authUser.id,
        name: fullName || null,
        phone: phone || null,
        role: "customer",
        email: email || null,
      });
      if (insErr) throw insErr;
    } else {
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
        user_id: userId,
        reservation_datetime,
        partysize: partySize,
        queue_code,
        status: "pending",
      });

      if (!error) {
        return queue_code;
      }

      const msg = (error as any)?.message || "";
      const isUnique =
        msg.includes("duplicate key value violates unique constraint") ||
        msg.includes("reservations_queue_code_key");
      if (!isUnique) throw error;

      if (attempt === MAX_RETRY) throw error;
    }

    throw new Error("ไม่สามารถบันทึกการจองได้ (queue_code ซ้ำหลายครั้ง)");
  };

  const verifyOTP = async (): Promise<boolean> => {
    setErr(null);
    setMsg(null);

    if (!otp.trim()) {
      setErr("กรุณากรอกรหัส OTP");
      return false;
    }

    setBusy(true);
    try {
      // ตรวจ OTP
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
        return false;
      }
      if (latest.otp_code !== otp) {
        setErr("รหัส OTP ไม่ถูกต้อง");
        return false;
      }

      // ดึงข้อมูล user
      const { data: u } = await supabase.auth.getUser();
      const authUser = u.user;
      if (!authUser) {
        setErr("กรุณาเข้าสู่ระบบอีกครั้ง");
        return false;
      }

      const publicUserId = await ensureProfile({ id: authUser.id });
      const code = await insertReservationWithRetries(publicUserId);

      setMsg(
        `ยืนยัน OTP สำเร็จ และบันทึกการจองเรียบร้อย! รหัสคิวของคุณคือ ${code}`
      );
      return true;
    } catch (e: any) {
      setErr(e?.message || "ไม่สามารถยืนยันรหัส OTP/บันทึกการจองได้");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const [settings, setSettings] = useState<{
    is_system_open: boolean;
    open_time: string;
    close_time: string;
    days_ahead: number;
  } | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("is_system_open,open_time,close_time,days_ahead")
        .eq("id", 1)
        .maybeSingle();
      setSettings(
        data ?? {
          is_system_open: true,
          open_time: "09:00",
          close_time: "21:00",
          days_ahead: 30,
        }
      );
    })();
  }, [supabase]);
  const [toast, setToast] = useState<{
    type: "error" | "success" | "info";
    message: string;
  } | null>(null);
  // --- Toast UI (วางในไฟล์เดียวกันกับหน้า Reservation) ---
  function Toast({
    type = "error",
    message,
    onClose,
  }: {
    type?: "error" | "success" | "info";
    message: string;
    onClose: () => void;
  }) {
    // auto-close 3s
    useEffect(() => {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }, [onClose]);

    const tone =
      type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : type === "info"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-rose-200 bg-rose-50 text-rose-800";

    return (
      <div className="fixed right-4 top-4 z-[70]">
        <div
          className={`max-w-xs rounded-xl border px-4 py-3 text-sm shadow ${tone}`}
        >
          <div className="flex items-start gap-3">
            <div className="font-medium">
              {type === "error"
                ? "แจ้งเตือน"
                : type === "success"
                ? "สำเร็จ"
                : "ข้อมูล"}
            </div>
            <button
              onClick={onClose}
              className="ml-auto rounded-md px-2 py-0.5 text-xs hover:opacity-70"
              aria-label="ปิดแจ้งเตือน"
            >
              ปิด
            </button>
          </div>
          <div className="mt-1 leading-5">{message}</div>
        </div>
      </div>
    );
  }

  const d = new Date(dateTime); // สิ่งที่ผู้ใช้เลือก
  const hh = d.getHours() * 60 + d.getMinutes();
  const [oh, om] = (settings?.open_time ?? "09:00").split(":").map(Number);
  const [ch, cm] = (settings?.close_time ?? "21:00").split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  // ใหม่: ตรวจเฉพาะตอนกด "ถัดไป" แล้วแจ้งเตือนแบบ Toast
  const handleNext = async () => {
    if (!settings) return;

    // ตรวจช่วงเวลาจาก app_settings
    const d = new Date(dateTime);
    if (Number.isNaN(d.getTime())) {
      setToast({ type: "error", message: "กรุณาเลือกวันและเวลาให้ถูกต้อง" });
      return;
    }

    const hh = d.getHours() * 60 + d.getMinutes();
    const [oh, om] = (settings.open_time ?? "09:00").split(":").map(Number);
    const [ch, cm] = (settings.close_time ?? "21:00").split(":").map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;

    if (hh < openMin || hh > closeMin) {
      setToast({
        type: "error",
        message: `เวลาที่เลือกอยู่นอกช่วงรับจอง (${settings.open_time} – ${settings.close_time})`,
      });
      return;
    }

    // ถ้าปิดระบบ
    if (settings.is_system_open === false) {
      setToast({
        type: "error",
        message: "ขณะนี้ปิดการรับจองชั่วคราว",
      });
      return;
    }

    // ✅ ผ่านเงื่อนไขแล้วค่อยไปขั้นถัดไป
    // ... proceed next step ...
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
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            Reservation
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            ระบบจองคิว
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            สามารถกรอกข้อมูลและจองคิวได้ที่นี่
          </p>
        </div>
      </div>

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
            <label className="block text-sm mb-1">อีเมล (อ่านอย่างเดียว)</label>
            <input
              type="email"
              value={email}
              disabled // ⬅️ ทำให้แก้ไม่ได้
              className="w-full rounded-lg border px-3 py-2 bg-gray-50 text-gray-700 cursor-not-allowed"
              placeholder="you@example.com"
              title="อีเมลใช้สำหรับเข้าสู่ระบบและไม่สามารถแก้ไขที่นี่"
            />
            <p className="mt-1 text-xs text-gray-500">
              อีเมลใช้สำหรับเข้าสู่ระบบเท่านั้น หากต้องการเปลี่ยนอีเมล
              โปรดติดต่อพนักงาน
            </p>
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

              {settings?.is_system_open === false && (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  ขณะนี้ปิดการรับจองชั่วคราว
                </div>
              )}

              {(() => {
                // คำนวณ min/max วันที่จาก days_ahead
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, "0");
                const toInputValue = (d: Date) =>
                  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
                    d.getDate()
                  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

                const minDate = now; // ไม่ยอมย้อนอดีต
                const maxDate = new Date(now);
                const days = settings?.days_ahead ?? 30;
                maxDate.setDate(now.getDate() + Math.max(0, days));

                const minAttr = toInputValue(minDate);
                const maxAttr = toInputValue(maxDate);

                return (
                  <>
                    <input
                      type="datetime-local"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      min={minAttr}
                      max={maxAttr}
                      disabled={settings?.is_system_open === false}
                      className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      เวลาเปิดรับจองรายวัน: {settings?.open_time ?? "09:00"} –{" "}
                      {settings?.close_time ?? "21:00"} / จองล่วงหน้าไม่เกิน{" "}
                      {settings?.days_ahead ?? 30} วัน
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await requestOTP();
                  setToast({
                    type: "success",
                    message: "ส่งรหัส OTP แล้ว กรุณาตรวจอีเมล/เบอร์ของคุณ",
                  });
                } catch (e: any) {
                  setToast({
                    type: "error",
                    message: e?.message || "ส่งรหัส OTP ไม่สำเร็จ",
                  });
                }
              }}
              disabled={busy || settings?.is_system_open === false}
              aria-busy={busy || undefined}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? "กำลังส่งรหัส..." : "ขอรหัส OTP"}
            </button>
          </div>

          {otpSent && (
            <p className="text-xs text-gray-500">
              รหัส OTP คือ{" "}
              <span className="font-mono font-semibold">{otpSent}</span>
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
              onClick={async () => {
                const ok = await verifyOTP();
                if (ok) {
                  window.location.href = "/"; // หรือใช้ router.replace("/")
                }
              }}
              disabled={busy}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "กำลังตรวจสอบ..." : "ยืนยัน OTP และจองคิว"}
            </button>
          </div>
        </section>
      )}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}

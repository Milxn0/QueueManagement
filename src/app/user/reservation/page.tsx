/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import type { Step } from "@/types/reservation";
import { pad, toInputValue, localInputToISO } from "@/utils/date";
import { validateReservationTime } from "@/utils/reservation";
import { createOTP, verifyOTP } from "@/lib/otp";
import { ensureProfile } from "@/lib/profile";
import { insertReservationWithRetries } from "@/lib/reservations";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsersLine } from "@fortawesome/free-solid-svg-icons/faUsersLine";

export default function ReservationPage() {
  // auth
  const { user, profile, loading: authLoading } = useAuth();

  // settings (open/close/days_ahead)
  const { settings, loading: settingsLoading } = useSettings();

  // stepper
  const [step, setStep] = useState<Step>(1);

  // form data (step 1)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [partySize, setPartySize] = useState<number>(1);
  const [dateTime, setDateTime] = useState<string>("");

  // otp (step 2)
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState<string | null>(null);

  // UI
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);

  // result
  const [queueCode, setQueueCode] = useState<string | null>(null);

  // ------ Prefill & defaults ------
  const fetchedRef = useRef(false);
  const lastFetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;
    if (lastFetchedForRef.current === user.id) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/user/autofill", {
          cache: "no-store",
          signal: controller.signal,
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          return;
        }

        const { name, phone: p, email: em } = await res.json();
        setFullName((v) => (v ? v : name ?? ""));
        setPhone((v) => (v ? v : p ?? ""));
        setEmail((v) => (v ? v : em ?? ""));

        lastFetchedForRef.current = user.id;
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("[autofill] fetch failed", e);
        }
      }
    })();

    return () => controller.abort();
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (!dateTime) {
      const d = new Date();
      d.setMinutes(d.getMinutes() + 30);
      setDateTime(toInputValue(d));
    }
  }, [dateTime]);

  // คำนวณ min/max ของ datetime-local
  const minDateTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return toInputValue(d);
  }, []);
  const maxDateTime = useMemo(() => {
    const d = new Date();
    const days = settings?.days_ahead ?? 30;
    d.setDate(d.getDate() + Number(days));
    d.setHours(23, 59, 0, 0);
    return toInputValue(d);
  }, [settings?.days_ahead]);

  // ------ Actions ------
  async function onRequestOTP() {
    try {
      if (!fullName.trim()) throw new Error("กรุณากรอกชื่อ-นามสกุล");
      if (!phone.trim()) throw new Error("กรุณากรอกเบอร์โทรศัพท์");
      if (!email.trim()) throw new Error("กรุณากรอกอีเมล");
      if (!dateTime.trim()) throw new Error("กรุณาเลือกวันและเวลา");
      if (!partySize || partySize < 1) throw new Error("จำนวนคนต้องมากกว่า 0");
      if (!/^\d{10}$/.test(phone)) {
        throw new Error("กรุณากรอกเบอร์โทรศัพท์ให้เป็นตัวเลข 10 หลัก");
      }
      if (partySize > 40) {
        throw new Error(
          "รองรับสูงสุด 40 คนต่อหนึ่งการจอง หากต้องการจำนวนมากกว่านี้กรุณาจองอีกรอบ"
        );
      }
      const v = validateReservationTime(settings, localInputToISO(dateTime));
      if (!v.ok) throw new Error(v.msg);

      setBusy(true);
      const code = await createOTP(phone);
      setOtpSent(code);
      setToast({
        type: "success",
        msg: "ส่งรหัส OTP แล้ว กรุณากรอกรหัสเพื่อยืนยัน",
      });
      setStep(2);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message ?? "ไม่สามารถส่ง OTP ได้" });
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmOTP() {
    try {
      if (!otp.trim()) throw new Error("กรุณากรอกรหัส OTP");
      setBusy(true);

      const ok = await verifyOTP(phone, otp);
      if (!ok) throw new Error("รหัส OTP ไม่ถูกต้อง");

      if (!user?.id) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      // ensure profile
      await ensureProfile(user.id, { name: fullName, phone, email });

      // insert reservation
      const iso = localInputToISO(dateTime);
      const code = await insertReservationWithRetries(
        user.id,
        iso,
        Number(partySize),
        comment
      );
      setQueueCode(code);
      setToast({ type: "success", msg: "จองคิวสำเร็จ!" });
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message ?? "ยืนยัน OTP ไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  // ------ Guards ------
  if (authLoading || settingsLoading) {
    return (
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-6" />
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-800">
            กรุณาเข้าสู่ระบบก่อน
          </h1>
          <p className="text-sm text-amber-800/80 mt-1">
            ต้องเข้าสู่ระบบเพื่อทำการจองคิว
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

  // ------ Success screen ------
  if (queueCode) {
    return (
      <main className="max-w-lg mx-auto px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            สำเร็จ
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
            จองคิวเรียบร้อย
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            เก็บรหัสคิวของคุณไว้เพื่อแสดงกับพนักงานเมื่อถึงเวลา
          </p>

          <div className="mt-6 rounded-xl border bg-gray-50 p-4">
            <div className="text-sm text-gray-600">รหัสคิวของคุณ</div>
            <div className="mt-1 text-3xl font-bold tracking-widest text-indigo-600">
              {queueCode}
            </div>
          </div>
          <div className="mt-6 rounded-xl border bg-gray-50 p-4">
            <div className="text-sm text-gray-600">
              ติดตามสถานะคิวผ่าน Line{" "}
              <p>พร้อมรับแจ้งเตือนเมื่อคิวของคุณมีการเปลี่ยนแปลง</p>
            </div>
            <div className="mt-3 flex justify-center">
              <img
                src="/82d41241-dd1b-4d7d-868f-09e7f42e3246.jfif"
                alt="QR Code สำหรับติดตามสถานะคิว Line"
                className="w-48 h-48 object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              href="/"
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
            >
              ดูคิวทั้งหมดในปัจจุบัน
            </Link>{" "}
            <Link
              href="/user/queue-history"
              className="rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              ดูประวัติการจองทั้งหมด
            </Link>
          </div>
        </div>

        {toast && (
          <Toast
            type={toast.type}
            message={toast.msg}
            onClose={() => setToast(null)}
          />
        )}
      </main>
    );
  }

  // ------ Form UI ------
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <section className="mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
          <div className="p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
              <FontAwesomeIcon icon={faUsersLine} />
              Reservation
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
              จองคิวร้านอาหาร
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              กรุณากรอกข้อมูลให้ครบถ้วนและยืนยันด้วยรหัส OTP
            </p>
          </div>
        </div>
      </section>

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-3">
        <StepDot active={step >= 1} label="กรอกข้อมูล" />
        <div className="h-px flex-1 bg-gray-200" />
        <StepDot active={step >= 2} label="ยืนยัน OTP" />
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput
              label="ชื่อ-นามสกุล"
              placeholder="สมชาย ใจดี"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <LabeledInput
              label="เบอร์โทรศัพท์"
              placeholder="08xxxxxxxx"
              type="tel"
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              value={phone}
              onChange={(e) => {
                const digitsOnly = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
                setPhone(digitsOnly);
              }}
            />
            <LabeledInput
              label="อีเมล"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <LabeledInput
              label="จำนวนคน"
              type="number"
              min={1}
              max={40}
              value={partySize}
              onChange={(e) => {
                const n = Number(e.target.value || 0);
                if (n > 40) {
                  setToast({
                    type: "info",
                    msg: "รองรับสูงสุด 40 คนต่อหนึ่งการจอง หากต้องการจำนวนมากกว่านี้กรุณาจองอีกรอบ",
                  });
                  setPartySize(40);
                } else if (n < 1) {
                  setPartySize(1);
                } else {
                  setPartySize(n);
                }
              }}
            />
            <LabeledInput
              label="ข้อมูลเพิ่มเติม"
              placeholder="เช่น นั่งแยก 2 โต๊ะ"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <LabeledInput
              className="md:col-span-2"
              label="วันและเวลา"
              type="datetime-local"
              value={dateTime}
              min={minDateTime}
              max={maxDateTime}
              step={60 * 5} // 5 นาที
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              เปิดให้จอง: {settings?.open_time ?? "09:00"}–
              {settings?.close_time ?? "21:00"} | จองล่วงหน้าได้ไม่เกิน{" "}
              {settings?.days_ahead ?? 30} วัน
            </p>
            <button
              disabled={busy}
              onClick={() => void onRequestOTP()}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "กำลังส่ง OTP..." : "ถัดไป: ส่ง OTP"}
            </button>
          </div>

          {!!otpSent && (
            <div className="mt-3 text-xs text-amber-600">
              โหมดทดสอบ: OTP = <span className="font-semibold">{otpSent}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyField label="ชื่อ-นามสกุล" value={fullName} />
            <ReadOnlyField label="เบอร์โทรศัพท์" value={phone} />
            <ReadOnlyField label="อีเมล" value={email} />
            <ReadOnlyField label="จำนวนคน" value={String(partySize)} />
            <ReadOnlyField label="ข้อมูลเพิ่มเติม" value={comment} />
            <ReadOnlyField label="วันและเวลา" value={dateTime} />
            <LabeledInput
              label="ใส่รหัส OTP"
              placeholder="******"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              disabled={busy}
              onClick={() => setStep(1)}
              className="rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              ย้อนกลับ
            </button>
            <button
              disabled={busy}
              onClick={() => void onConfirmOTP()}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "กำลังยืนยัน..." : "ยืนยันและจองคิว"}
            </button>
          </div>

          {!!otpSent && (
            <div className="mt-3 text-xs text-amber-600">
              โหมดทดสอบ: OTP = <span className="font-semibold">{otpSent}</span>
            </div>
          )}
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}

/* ---------- Small UI pieces ---------- */

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-3 w-3 rounded-full ring-2 ${
          active ? "bg-indigo-600 ring-indigo-200" : "bg-gray-300 ring-gray-200"
        }`}
      />
      <span
        className={`text-sm ${active ? "text-indigo-700" : "text-gray-500"}`}
      >
        {label}
      </span>
    </div>
  );
}

function LabeledInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    className?: string;
  }
) {
  const { label, className, ...rest } = props;
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <input
        {...rest}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </div>
      <div className="w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {value}
      </div>
    </div>
  );
}

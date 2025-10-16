import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: "env_not_configured: missing SUPABASE_URL / SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
      return NextResponse.json(
        { error: "env_not_configured: missing RESEND_API_KEY / MAIL_FROM" },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }
    const normEmail = String(email).toLowerCase();

    const { count } = await supabase
      .from("otp_verifications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .eq("email", normEmail);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "คุณทำรายการไวเกินไปกรุณรอสักครู่..." },
        { status: 429 }
      );
    }

    const code = genOTP();

    // บันทึก OTP
    const { error: insertErr } = await supabase
      .from("otp_verifications")
      .insert({
        email: normEmail,
        otp_code: code,
      });
    if (insertErr) throw insertErr;

    const subject = "รหัสยืนยันสำหรับจองคิว (OTP)";
    const text = `รหัสยืนยันของคุณคือ ${code}\nรหัสจะหมดอายุใน 5 นาที`;
    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;">
        <h2 style="margin:0 0 8px">รหัสยืนยันสำหรับจองคิว</h2>
        <p style="margin:0 0 12px;color:#475569">รหัสจะหมดอายุใน 5 นาที</p>
        <div style="display:inline-block;padding:12px 16px;border-radius:12px;background:#111827;color:#fff;font-size:24px;letter-spacing:4px;font-weight:700">
          ${code}
        </div>
      </div>`;
    const sent = await resend.emails.send({
      from: process.env.MAIL_FROM!,
      to: normEmail,
      subject,
      text,
      html,
    });
    if (sent.error) {
      await supabase
        .from("otp_verifications")
        .delete()
        .eq("email", normEmail)
        .eq("otp_code", code);
      throw new Error(sent.error.message);
    }

    return NextResponse.json({
      ok: true,
      ...(process.env.NODE_ENV !== "production" ? { code } : {}),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "send_failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
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

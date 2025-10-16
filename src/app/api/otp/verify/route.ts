export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "env_not_configured: missing SUPABASE_URL / SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // ดึง OTP ล่าสุดภายใน 5 นาที
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data, error } = await supabase
      .from("otp_verifications")
      .select("id, otp_code, created_at")
      .eq("phone", phone)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, reason: "otp_not_found_or_expired" },
        { status: 400 }
      );
    }

    const ok = data.otp_code === code;
    if (!ok) {
      return NextResponse.json(
        { ok: false, reason: "otp_incorrect" },
        { status: 400 }
      );
    }

    await supabase.from("otp_verifications").delete().eq("id", data.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "verify_failed" },
      { status: 500 }
    );
  }
}

// src/app/api/line/issue-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { hmacVerify } from "@/lib/line";
export const runtime = "nodejs";
const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบก่อน" },
      { status: 401 }
    );

  const { token, sig } = await req.json();
  if (!token || !sig)
    return NextResponse.json({ error: "ลิงก์ไม่ถูกต้อง" }, { status: 400 });

  if (!hmacVerify(token, sig))
    return NextResponse.json({ error: "ลิงก์ไม่ถูกต้อง" }, { status: 400 });

  const [id, nonce] = token.split(".");
  const { data: t } = await svc
    .from("line_link_sessions")
    .select("id, line_user_id, queue_code, nonce, expires_at, used_at, purpose")
    .eq("id", id)
    .maybeSingle();

  if (
    !t ||
    t.used_at ||
    t.purpose !== "link" ||
    t.nonce !== nonce ||
    new Date(t.expires_at) < new Date()
  ) {
    return NextResponse.json(
      { error: "ลิงก์ไม่ถูกต้องหรือหมดอายุ" },
      { status: 410 }
    );
  }

  let resv: { id: string; user_id: string } | null = null;
  if (t.queue_code) {
    const { data: r } = await svc
      .from("reservations")
      .select("id, user_id")
      .eq("queue_code", t.queue_code)
      .maybeSingle();

    if (!r || r.user_id !== user.id) {
      return NextResponse.json(
        { error: "บัญชีที่ล็อกอินไม่ใช่เจ้าของ Queue นี้" },
        { status: 409 }
      );
    }
    resv = r;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // มาร์กลิงก์ใช้แล้ว และออก OTP (purpose='otp')
  await svc
    .from("line_link_sessions")
    .update({ used_at: new Date().toISOString() })
    .eq("id", t.id);

  // ✅ ออก OTP โดยไม่ต้องมี reservation_id ก็ได้
  await svc.from("line_link_sessions").insert({
    purpose: "otp",
    line_user_id: t.line_user_id,
    user_id: user.id,
    reservation_id: resv?.id ?? null,
    code,
    expires_at: expiresAt,
  });

  return NextResponse.json({ code });
}

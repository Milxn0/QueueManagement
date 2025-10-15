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
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { token, sig } = await req.json();
  if (!token || !sig) return new NextResponse("Bad Request", { status: 400 });

  if (!hmacVerify(token, sig))
    return new NextResponse("Invalid signature", { status: 403 });

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
    return new NextResponse("Expired/Used", { status: 410 });
  }

  const { data: resv } = await svc
    .from("reservations")
    .select("id, user_id")
    .eq("queue_code", t.queue_code)
    .maybeSingle();

  if (!resv || resv.user_id !== user.id)
    return new NextResponse("Forbidden", { status: 403 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // มาร์กลิงก์ใช้แล้ว และออก OTP (purpose='otp')
  await svc
    .from("line_link_sessions")
    .update({ used_at: new Date().toISOString() })
    .eq("id", t.id);

  await svc.from("line_link_sessions").insert({
    purpose: "otp",
    line_user_id: t.line_user_id,
    user_id: user.id,
    reservation_id: resv.id,
    code,
    expires_at: expiresAt,
  });

  return NextResponse.json({ code });
}

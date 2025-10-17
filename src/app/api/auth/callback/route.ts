/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const { event, session } = await req.json();

  // อัปเดตคุกกี้ตามสถานะ
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    await supabase.auth.setSession({
      access_token: session?.access_token ?? "",
      refresh_token: session?.refresh_token ?? "",
    });
  } else if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }

  return res;
}

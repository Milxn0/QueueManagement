/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const { userId, newPassword } = await req.json();

    if (
      !userId ||
      typeof userId !== "string" ||
      !newPassword ||
      newPassword.length < 8
    ) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options });
            });
          },
        },
      }
    );

    // ตรวจสิทธิ์ผู้เรียก → ต้องเป็น admin
    const { data: auth } = await supabase.auth.getUser();
    const caller = auth.user;
    if (!caller) {
      return NextResponse.json({ error: "ต้องเข้าสู่ระบบ" }, { status: 401 });
    }

    const { data: me, error: meErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (meErr || me?.role !== "admin") {
      return NextResponse.json(
        { error: "ต้องเป็นแอดมินเท่านั้น" },
        { status: 403 }
      );
    }

    // ใช้ Service Role อัปเดตรหัสผ่านของผู้ใช้เป้าหมาย
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "ไม่ได้ตั้งค่า Service Role Key" },
        { status: 500 }
      );
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

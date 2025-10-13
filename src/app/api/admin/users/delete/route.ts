/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    // 1) ตรวจสิทธิ์ผู้เรียก (ต้องเป็น admin)
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
        },
      }
    );
    const { data: auth } = await supabaseAuth.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "ต้องเข้าสู่ระบบ" }, { status: 401 });
    }

    // กันลบบัญชีตัวเอง
    if (auth.user.id === id) {
      return NextResponse.json(
        { error: "ไม่สามารถลบบัญชีของตัวเองได้" },
        { status: 400 }
      );
    }

    const { data: me, error: meErr } = await supabaseAuth
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .single();

    if (meErr || me?.role !== "admin") {
      return NextResponse.json({ error: "ต้องเป็นแอดมินเท่านั้น" }, { status: 403 });
    }

    // 2) ลบข้อมูลใน public.users ก่อน (กันปัญหา FK)
    const admin = createServiceClient();
    const { error: dbErr } = await admin.from("users").delete().eq("id", id);
    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 400 });
    }

    // 3) ลบผู้ใช้ในระบบ Auth (GoTrue)
    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) {
      return NextResponse.json(
        { error: `ลบบัญชีใน Auth ไม่สำเร็จ: ${authErr.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/users/create/route.ts
import { NextResponse } from "next/server";
import {
  createServerAuthedClient,
  createServiceClient,
} from "@/lib/supabaseService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body?.name ?? "").toString().trim();
    const email = (body?.email ?? "").toString().trim();
    const phone = body?.phone ?? "" ? (body.phone as string).trim() : null;
    const role = (body?.role ?? "staff").toString().trim();
    const password = (body?.password ?? "").toString();

    if (!name)
      return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
    if (!email)
      return NextResponse.json({ error: "กรุณากรอกอีเมล" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json(
        { error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );

    // 1) ตรวจสิทธิ์ผู้เรียก (ต้องเป็น admin)
    const authed = await createServerAuthedClient();
    const { data: auth } = await authed.auth.getUser();
    if (!auth.user)
      return NextResponse.json({ error: "ต้องเข้าสู่ระบบ" }, { status: 401 });

    const { data: me, error: meErr } = await authed
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .single();
    if (meErr || me?.role !== "admin") {
      return NextResponse.json(
        { error: "ต้องเป็นแอดมินเท่านั้น" },
        { status: 403 }
      );
    }

    // 2) สร้างผู้ใช้ใน Auth (Service Role)
    const admin = createServiceClient();
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // ถือว่ายืนยันแล้ว (ถ้าอยากส่งอีเมลยืนยันให้เปลี่ยนเป็น false)
        phone: phone ?? undefined,
        phone_confirm: !!phone, // ถ้ามีเบอร์ ให้ confirm ด้วย
        user_metadata: { name, role },
      });
    if (createErr) {
      return NextResponse.json(
        { error: `สร้างบัญชีไม่สำเร็จ: ${createErr.message}` },
        { status: 400 }
      );
    }
    const newId = created.user?.id;
    if (!newId) {
      return NextResponse.json(
        { error: "ไม่พบ user id ที่สร้างจาก Auth" },
        { status: 400 }
      );
    }

    // 3) เพิ่มแถวใน public.users ให้ id ตรงกับ Auth
    const { data: row, error: upErr } = await admin
      .from("users")
      .upsert(
        { id: newId, name, email, phone, role },
        { onConflict: "id", ignoreDuplicates: false } // ← ถ้ามีอยู่แล้วให้ update
      )
      .select()
      .single();

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    return NextResponse.json({ data: row });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

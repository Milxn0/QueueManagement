import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { id, payload } = await req.json();
  if (!id || !payload) {
    return NextResponse.json({ error: "missing id/payload" }, { status: 400 });
  }

  // 1) ตรวจสิทธิ์ผู้เรียก ต้องเป็น admin
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
  if (!auth.user)
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบ" }, { status: 401 });

  const { data: me, error: meErr } = await supabaseAuth
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

  // 2) อัปเดตด้วย Service Role
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

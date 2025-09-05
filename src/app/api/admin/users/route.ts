/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";

export const dynamic = "force-dynamic"; // ห้าม cache (ให้ดึงสดเสมอ)

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,phone,role,created_at")
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // admin ไว้บนสุด แล้วเรียงต่อด้วย created_at ใหม่ก่อน
  const weight = (u: any) => (u.role === "admin" ? 0 : 1);
  const sorted =
    (data ?? []).slice().sort((a: any, b: any) => {
      const w = weight(a) - weight(b);
      if (w !== 0) return w;
      return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    });

  return NextResponse.json(sorted);
}

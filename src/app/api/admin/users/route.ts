/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,phone,role,created_at")
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const weight = (u: any) => (u.role === "admin" ? 0 : 1);
  const sorted =
    (data ?? []).slice().sort((a: any, b: any) => {
      const w = weight(a) - weight(b);
      if (w !== 0) return w;
      return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    });

  return NextResponse.json(sorted);
}

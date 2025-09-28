import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";

export async function POST(req: Request) {
  const supabase = createServiceClient();
  const body = (await req.json().catch(() => ({}))) as {
    user_id?: string;
  };

  if (!body.user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const { data: u, error: eU } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", body.user_id)
    .maybeSingle();

  if (eU) return NextResponse.json({ error: eU.message }, { status: 500 });
  if (!u)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { error: eIns } = await supabase.from("user_activity").insert({
    user_id: u.id,
    role_snapshot: u.role ?? "customer",
    action: "login",
    occurred_at: new Date().toISOString(),
    metadata: null,
  });

  if (eIns) return NextResponse.json({ error: eIns.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);

  const start = searchParams.get("start") || undefined;
  const end = searchParams.get("end") || undefined;
  const status = searchParams.get("status") || undefined;

  let q = supabase
    .from("reservations")
    .select(
      `
      id, user_id, reservation_datetime, partysize, queue_code, status, comment, created_at, table_id,
      user:users!reservations_user_id_fkey(name, phone, email),
      cancelled_at, cancelled_reason,
      cancelled_by:users!reservations_cancelled_by_user_id_fkey(name, role),
      tbl:tables!reservations_table_id_fkey(table_name)
    `
    )
    .order("reservation_datetime", { ascending: false })
    .limit(200);

  if (start) q = q.gte("reservation_datetime", start);
  if (end) q = q.lte("reservation_datetime", end);

  if (status) {
    const s = status.toLowerCase();
    if (s.includes("cancel")) q = q.eq("status", "cancelled");
    else q = q.eq("status", s);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

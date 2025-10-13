import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("id,user_id,reservation_datetime,queue_code,status,created_at,partysize")
    .or("status.eq.waiting,status.eq.WAITING,status.ilike.waiting%")
    .order("reservation_datetime", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

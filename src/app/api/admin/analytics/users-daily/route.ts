import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end"); 

  if (!start || !end) {
    return NextResponse.json({ error: "start/end required" }, { status: 400 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("users_daily_logins")
    .select("day_th, role_snapshot, visits")
    .gte("day_th", start.slice(0,10))
    .lte("day_th", end.slice(0,10));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = new Map<string, { date: string; customer: number; staff: number }>();
  for (const row of (data ?? [])) {
    const dateStr = String(row.day_th);
    if (!map.has(dateStr)) map.set(dateStr, { date: dateStr, customer: 0, staff: 0 });
    const entry = map.get(dateStr)!;
    if (row.role_snapshot === "customer") entry.customer += Number(row.visits ?? 0);
    if (row.role_snapshot === "staff") entry.staff += Number(row.visits ?? 0);
  }

  return NextResponse.json(Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date)));
}

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") || "").trim();
  const rolesParam = (searchParams.get("roles") || "customer,staff").trim();
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!name) return NextResponse.json([], { status: 200 });
  if (!start || !end)
    return NextResponse.json({ error: "start/end required" }, { status: 400 });

  const roles = rolesParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as ("customer" | "staff")[];

  const supabase = createServiceClient();

  const { data: users, error: eUsers } = await supabase
    .from("users")
    .select("id")
    .in("role", roles)
    .or(`name.ilike.%${name}%,email.ilike.%${name}%,phone.ilike.%${name}%`);

  if (eUsers)
    return NextResponse.json({ error: eUsers.message }, { status: 500 });
  const ids = (users ?? []).map((u) => u.id);
  if (ids.length === 0) return NextResponse.json([]);

  const { data: acts, error: eActs } = await supabase
    .from("user_activity")
    .select("occurred_at")
    .eq("action", "login")
    .in("user_id", ids)
    .gte("occurred_at", start)
    .lt("occurred_at", end);

  if (eActs)
    return NextResponse.json({ error: eActs.message }, { status: 500 });

  const map = new Map<string, number>();
  for (const a of acts ?? []) {
    const d = new Date(a.occurred_at as string);
    const y = d.toLocaleString("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    });
    const mo = d.toLocaleString("en-CA", {
      timeZone: "Asia/Bangkok",
      month: "2-digit",
    });
    const da = d.toLocaleString("en-CA", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
    });
    const key = `${y}-${mo}-${da}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const rows = Array.from(map.entries())
    .map(([day_th, visits]) => ({ day_th, visits }))
    .sort((a, b) => a.day_th.localeCompare(b.day_th));

  return NextResponse.json(rows);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase.from("users").select("role");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const totals = { all: 0, customer: 0, staff: 0, admin: 0 };
  for (const r of data ?? []) {
    totals.all++;
    const role = (r.role ?? "customer") as "customer" | "staff" | "admin";
    if (totals[role] != null) (totals as any)[role]++;
  }

  return NextResponse.json(totals);
}

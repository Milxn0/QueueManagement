/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";

export async function GET() {
  const supabase = createServiceClient();

  const { data: baseRows, error } = await supabase
    .from("reservations")
    .select(
      "id,user_id,reservation_datetime,queue_code,status,created_at,partysize"
    )
    .or("status.eq.waiting,status.eq.WAITING,status.ilike.waiting%")
    .order("reservation_datetime", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rows = baseRows ?? [];

  const userIds = Array.from(
    new Set(
      rows
        .map((r) => r.user_id)
        .filter((x): x is string => !!x && typeof x === "string")
    )
  );

  let usersMap = new Map<
    string,
    { id: string; name: string | null; phone: string | null; email: string | null }
  >();

  if (userIds.length > 0) {
    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id,name,phone,email")
      .in("id", userIds);

    if (!uErr && Array.isArray(users)) {
      usersMap = new Map(
        users.map((u: any) => [
          String(u.id),
          {
            id: String(u.id),
            name: u?.name ?? null,
            phone: u?.phone ?? null,
            email: u?.email ?? null,
          },
        ])
      );
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    user: r.user_id ? usersMap.get(String(r.user_id)) ?? null : null,
  }));

  return NextResponse.json(
    { data: enriched },
    { headers: { "Cache-Control": "no-store" } }
  );
}

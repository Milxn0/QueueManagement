import { NextResponse } from "next/server";
import { serverSupabase } from "@/app/api/_helpers/supabaseServer";
import { listReservationsByUser } from "@/server/controllers/reservationsController";
export const runtime = "nodejs";
export async function GET() {
  const sb = serverSupabase();
  const {
    data: { user },
  } = await (await sb).auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listReservationsByUser(sb, user.id);
  return NextResponse.json(rows);
}

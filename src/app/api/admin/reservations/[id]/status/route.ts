import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyReservationStatusChange } from "@/app/api/_helpers/linePush";

export const runtime = "nodejs";

type Action = "confirm" | "seat" | "paid" | "cancel";

export async function PATCH(_req: Request, ctx: { params: { id: string } }) {
  const { params } = ctx;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await _req.json().catch(() => ({} as any));
  const action = (body?.action as Action) || "confirm";

  let update: Record<string, any> = {};
  if (action === "confirm") {
    update = { status: "confirmed" };
  } else if (action === "seat") {
    update = { status: "seated" };
  } else if (action === "paid") {
    update = { status: "paid", paid_at: new Date().toISOString() };
  } else if (action === "cancel") {
    update = {
      status: "cancelled",
      cancelled_reason: body?.reason ?? "—",
      cancelled_by_user_id: body?.by_user_id ?? null,
      cancelled_at: new Date().toISOString(),
    };
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reservations")
    .update(update)
    .eq("id", params.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  // ส่งแจ้งเตือนไป LINE
  notifyReservationStatusChange(params.id).catch(() => {});
  return NextResponse.json({ ok: true });
}

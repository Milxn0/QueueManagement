import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyReservationStatusChange } from "@/app/api/_helpers/linePush";

export const runtime = "nodejs";

type Action = "confirm" | "seat" | "paid" | "cancel";

export async function PATCH(req: Request, ctx: any) {
  const id = (ctx?.params?.id as string) ?? "";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json().catch(() => ({} as any));
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

  const { error } = await supabase.from("reservations").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (action === "confirm") {
    try {
      await notifyReservationStatusChange(id);
    } catch (e) {
      console.error("[notify confirm] failed:", (e as Error)?.message);
    }
  }

  return NextResponse.json({ ok: true });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const supabase = createServiceClient();
    const { id } = ctx.params;
    const body = await req.json().catch(() => ({}));
    const reservation_datetime: string | undefined = body?.reservation_datetime;
    const partysizeRaw = body?.partysize;
    const partysize = Number(partysizeRaw);

    if (!id)
      return NextResponse.json(
        { error: "missing reservation id" },
        { status: 400 }
      );
    if (!reservation_datetime && !Number.isFinite(partysize)) {
      return NextResponse.json(
        { error: "no fields to update" },
        { status: 400 }
      );
    }

    const patch: Record<string, any> = {};
    if (reservation_datetime) patch.reservation_datetime = reservation_datetime;
    if (Number.isFinite(partysize)) patch.partysize = partysize;

    const { error } = await supabase
      .from("reservations")
      .update(patch)
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true, id, patch });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const supabase = createServiceClient();
    const { id } = ctx.params;
    if (!id)
      return NextResponse.json(
        { error: "missing reservation id" },
        { status: 400 }
      );

    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true, id, status: "cancelled" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}

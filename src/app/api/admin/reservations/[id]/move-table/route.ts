/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
import { tableNameFromNo } from "@/utils/tables";
export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const toNo = Number(body?.toNo);

    if (!id)
      return NextResponse.json(
        { error: "missing reservation id" },
        { status: 400 }
      );
    if (!Number.isFinite(toNo)) {
      return NextResponse.json({ error: "invalid toNo" }, { status: 400 });
    }

    const tname = tableNameFromNo(toNo);
    const { data: t, error: terr } = await supabase
      .from("tables")
      .select("id")
      .eq("table_name", tname)
      .maybeSingle();
    if (terr) throw terr;
    if (!t?.id)
      return NextResponse.json({ error: `ไม่พบ ${tname}` }, { status: 404 });

    const { error: uerr } = await supabase
      .from("reservations")
      .update({ table_id: t.id })
      .eq("id", id);
    if (uerr) throw uerr;

    return NextResponse.json({ ok: true, reservationId: id, toNo });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}

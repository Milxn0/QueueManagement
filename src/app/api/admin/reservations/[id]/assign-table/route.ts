/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
import { tableNameFromNo } from "@/utils/tables";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const supabase = createServiceClient();
    const { id } = ctx.params;
    const body = await req.json().catch(() => ({}));
    const tableNo = Number(body?.tableNo);

    if (!id)
      return NextResponse.json(
        { error: "missing reservation id" },
        { status: 400 }
      );
    if (!Number.isFinite(tableNo)) {
      return NextResponse.json({ error: "invalid tableNo" }, { status: 400 });
    }

    // หา table_id จากหมายเลขโต๊ะ
    const tname = tableNameFromNo(tableNo);
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

    return NextResponse.json({ ok: true, reservationId: id, tableNo });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}

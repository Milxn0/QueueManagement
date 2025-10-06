/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

type Body = {
  reservationId?: string; 
  partySize: number;
  tableIds?: string[];
  tableNos?: number[];
};

const getTableNo = (name?: string | null) => {
  const m = String(name ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> } 
) {
  const { id: reservationIdFromPath } = await ctx.params;

  try {
    const body = (await req.json()) as Body;
    const { partySize } = body;

    if (!reservationIdFromPath || !Number.isFinite(partySize)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 0) เวลาเป้าหมายของการจอง
    const { data: me, error: meErr } = await supabase
      .from("reservations")
      .select("id, reservation_datetime, status")
      .eq("id", reservationIdFromPath)
      .maybeSingle();

    if (meErr || !me) {
      return NextResponse.json({ error: "reservation not found" }, { status: 404 });
    }

    const myWhen = me.reservation_datetime ? new Date(me.reservation_datetime) : null;
    if (!myWhen || Number.isNaN(myWhen.getTime())) {
      return NextResponse.json({ error: "reservation has invalid datetime" }, { status: 400 });
    }

    // 1) เตรียม table_id[]
    let tableIds: string[] = Array.isArray(body.tableIds) ? body.tableIds.filter(Boolean) : [];

    if (!tableIds.length && Array.isArray(body.tableNos) && body.tableNos.length) {
      const { data: trows, error: terr } = await supabase
        .from("tables")
        .select("id, table_name");

      if (terr) return NextResponse.json({ error: terr.message }, { status: 500 });

      const pickedSet = new Set(body.tableNos);
      const matched = (trows ?? []).filter((t: any) => {
        const no = getTableNo(t?.table_name);
        return no != null && pickedSet.has(no);
        });
      tableIds = matched.map((t: any) => t.id);
    }

    if (!tableIds.length) {
      return NextResponse.json({ error: "no tables selected" }, { status: 400 });
    }

    // 2) ดึง capacity
    const { data: tables, error: tErr } = await supabase
      .from("tables")
      .select("id, table_name, capacity")
      .in("id", tableIds);

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    if (!tables?.length) return NextResponse.json({ error: "tables not found" }, { status: 400 });

    // 3) ตรวจ capacity รวม (cap+2)
    const allowedSum = tables.reduce((s, t: any) => s + (Number(t?.capacity) || 0) + 2, 0);
    if (allowedSum < partySize) {
      return NextResponse.json(
        { error: "insufficient capacity", detail: { partySize, allowedSum, need: partySize - allowedSum } },
        { status: 400 }
      );
    }

    // 4) กันชน ±2 ชม.
    const minus = new Date(myWhen.getTime() - TWO_HOURS_MS).toISOString();
    const plus  = new Date(myWhen.getTime() + TWO_HOURS_MS).toISOString();

    const { data: conflicts, error: cErr } = await supabase
      .from("reservation_tables")
      .select(`
        reservation_id,
        table_id,
        tables!inner (table_name),
        reservations!inner (id, status, reservation_datetime)
      `)
      .in("table_id", tableIds);

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    const conflictRows = (conflicts ?? []).filter((r: any) => {
      const rid = r.reservations?.id;
      if (!rid || rid === reservationIdFromPath) return false;
      const st = String(r.reservations?.status ?? "").toLowerCase();
      if (st.includes("cancel")) return false;
      const dt = r.reservations?.reservation_datetime ? new Date(r.reservations.reservation_datetime) : null;
      if (!dt || Number.isNaN(dt.getTime())) return false;
      const iso = dt.toISOString();
      return iso >= minus && iso <= plus;
    });

    if (conflictRows.length) {
      const detail = conflictRows.map((r: any) => ({
        table_no: getTableNo(r.tables?.table_name) ?? "?",
        other_reservation_id: r.reservations?.id,
        other_status: r.reservations?.status,
        other_time: r.reservations?.reservation_datetime,
      }));
      return NextResponse.json({ error: "time conflict", detail }, { status: 409 });
    }

    // 5) clear เดิม + insert ใหม่
    const { error: delErr } = await supabase
      .from("reservation_tables")
      .delete()
      .eq("reservation_id", reservationIdFromPath);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const rowsToInsert = tables.map((t: any) => ({
      reservation_id: reservationIdFromPath,
      table_id: t.id,
      seats_assigned: 0,
    }));
    const { error: insErr } = await supabase.from("reservation_tables").insert(rowsToInsert);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    // 6) อัปเดตตาราง reservations ให้เป็น "seated" และ (ถ้ามีคอลัมน์ table_id) ตั้ง table แรกเป็น primary
    const primaryTableId = tables[0]?.id ?? null;
    const updatePayload: Record<string, any> = { status: "seated" };
    if (primaryTableId) updatePayload.table_id = primaryTableId;

    const { error: upErr } = await supabase
      .from("reservations")
      .update(updatePayload)
      .eq("id", reservationIdFromPath);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json(
      {
        ok: true,
        assigned: tables.map((t: any) => ({
          table_id: t.id,
          table_no: getTableNo(t.table_name),
        })),
        capacity: { partySize, allowedSum },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

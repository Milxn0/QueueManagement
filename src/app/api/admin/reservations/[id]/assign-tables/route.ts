/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await ctx.params;
    if (!reservationId)
      return NextResponse.json(
        { error: "missing reservation id" },
        { status: 400 }
      );

    const body = await req.json().catch(() => ({}));
    const tableNos: number[] = Array.isArray(body?.tableNos)
      ? body.tableNos
          .map((n: any) => Number(n))
          .filter((n: any) => Number.isFinite(n))
      : [];
    const partySize: number = Math.max(0, Number(body?.partySize) || 0);
    if (!tableNos.length)
      return NextResponse.json(
        { error: "tableNos is required" },
        { status: 400 }
      );

    const sb = createServiceClient();

    // 1) ดึงข้อมูลการจอง
    const { data: resv, error: resvErr } = await sb
      .from("reservations")
      .select("id, reservation_datetime, status, cancelled_at, queue_code")
      .eq("id", reservationId)
      .maybeSingle();

    if (resvErr || !resv)
      return NextResponse.json(
        { error: resvErr?.message || "reservation not found" },
        { status: 404 }
      );
    if (resv.cancelled_at)
      return NextResponse.json(
        { error: "reservation already cancelled" },
        { status: 409 }
      );

    const baseISO = String(resv.reservation_datetime ?? "");
    const base = new Date(baseISO);
    if (Number.isNaN(base.getTime()))
      return NextResponse.json(
        { error: "invalid reservation_datetime" },
        { status: 400 }
      );

    // 2) แปลงหมายเลขโต๊ะ -> table ids และความจุ
    const { data: allTables, error: tblErr } = await sb
      .from("tables")
      .select("id, table_name, capacity");
    if (tblErr)
      return NextResponse.json({ error: tblErr.message }, { status: 500 });

    const parseNo = (name?: string | null) => {
      const m = String(name ?? "").match(/\d+/);
      return m ? Number(m[0]) : null;
    };

    const picked = (allTables ?? [])
      .map((t: any) => ({
        id: t.id as string,
        no: parseNo(t.table_name),
        cap: Number(t.capacity ?? 0),
      }))
      .filter((t) => t.no != null && tableNos.includes(t.no as number));

    if (picked.length !== tableNos.length)
      return NextResponse.json(
        { error: "some tables not found" },
        { status: 400 }
      );

    // 3) ตรวจความจุรวม (cap + 2) ≥ partySize
    const allowedSum = picked.reduce((s, t) => s + (t.cap + 2), 0);
    if (partySize > allowedSum) {
      return NextResponse.json(
        { error: `ที่นั่งรวมไม่พอ ต้องการ ${partySize} แต่ได้ ${allowedSum}` },
        { status: 400 }
      );
    }

    // 4) ตรวจชนเวลาตามเวลานั่งจริง (DINE_MINUTES) + ดูเฉพาะ mapping ที่ยัง active
    const DINE_MIN_MS =
      Number(process.env.NEXT_PUBLIC_DINE_MINUTES || 90) * 60 * 1000;
    const myStart = new Date(base.getTime() - DINE_MIN_MS);
    const myEnd = new Date(base.getTime() + DINE_MIN_MS);

    const pickedIds = picked.map((p) => p.id);
    const fetchStart = myStart.toISOString();
    const fetchEnd = myEnd.toISOString();

    const { data: occ, error: occErr } = await sb
      .from("reservation_tables")
      .select(
        `
        table_id,
        released_at,
        reservations:reservation_id!inner(
          id, queue_code, reservation_datetime, status, cancelled_at
        )
      `
      )
      .in("table_id", pickedIds)
      .neq("reservation_id", reservationId)
      .is("released_at", null) // ⬅️ เฉพาะ mapping ที่ยัง active
      .is("reservations.cancelled_at", null)
      .in("reservations.status", [
        "seated",
        "confirmed",
        "confirm",
        "Seated",
        "Confirmed",
        "Confirm", // ⬅️ ไม่รวม paid
      ])
      .gte("reservations.reservation_datetime", fetchStart)
      .lte("reservations.reservation_datetime", fetchEnd);

    if (occErr)
      return NextResponse.json({ error: occErr.message }, { status: 500 });

    const id2no = new Map<string, number>();
    picked.forEach((p) => id2no.set(p.id, p.no as number));

    const conflicts = new Set<number>();
    for (const row of occ ?? []) {
      const otherISO: string | null =
        (Array.isArray((row as any)?.reservations)
          ? (row as any)?.reservations?.[0]?.reservation_datetime
          : (row as any)?.reservations?.reservation_datetime) ?? null;
      if (!otherISO) continue;
      const other = new Date(otherISO);
      if (Number.isNaN(other.getTime())) continue;

      const otherStart = new Date(other.getTime() - DINE_MIN_MS);
      const otherEnd = new Date(other.getTime() + DINE_MIN_MS);
      const overlap = myStart < otherEnd && otherStart < myEnd;
      if (overlap) {
        const no = id2no.get(row.table_id);
        if (no != null) conflicts.add(no);
      }
    }

    if (conflicts.size > 0) {
      return NextResponse.json(
        {
          error: `โต๊ะ ${[...conflicts].join(
            ", "
          )} ถูกใช้งานช่วงเวลาใกล้เคียงโดยคิวอื่น`,
        },
        { status: 409 }
      );
    }

    // 5) ซิงค์ reservation_tables
    //   - ลบเฉพาะ mapping ที่ "ยัง active" และไม่อยู่ในชุดใหม่
    //   - แทรก mapping ใหม่ด้วย released_at = null
    const { data: currentMaps, error: mapErr } = await sb
      .from("reservation_tables")
      .select("table_id, released_at")
      .eq("reservation_id", reservationId);

    if (mapErr)
      return NextResponse.json({ error: mapErr.message }, { status: 500 });

    const currentActiveIds = new Set(
      (currentMaps ?? [])
        .filter((m: any) => m.released_at == null)
        .map((m: any) => m.table_id as string)
    );
    const wantIds = new Set(pickedIds);

    const toDelete = Array.from(currentActiveIds).filter(
      (id) => !wantIds.has(id)
    );
    const toInsert = Array.from(wantIds).filter(
      (id) => !currentActiveIds.has(id)
    );

    if (toDelete.length > 0) {
      const { error: delErr } = await sb
        .from("reservation_tables")
        .delete()
        .eq("reservation_id", reservationId)
        .is("released_at", null)
        .in("table_id", toDelete);
      if (delErr)
        return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    if (toInsert.length > 0) {
      const rows = toInsert.map((table_id) => ({
        reservation_id: reservationId,
        table_id,
        released_at: null,
      }));
      const { error: insErr } = await sb
        .from("reservation_tables")
        .insert(rows);
      if (insErr)
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // 6) อัปเดตสถานะเป็น "seated"
    const { error: updErr } = await sb
      .from("reservations")
      .update({ status: "seated" })
      .eq("id", reservationId);
    if (updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json(
      {
        ok: true,
        reservationId,
        tables: picked.map((p) => ({ id: p.id, no: p.no, cap: p.cap })),
        allowedSum,
        partySize,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "unknown error" },
      { status: 500 }
    );
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await ctx.params;
    if (!reservationId) return NextResponse.json({ error: "reservationId missing" }, { status: 400 });

    const url = new URL(req.url);
    const dt = url.searchParams.get("dt");

    const base = dt ? new Date(dt) : new Date();
    if (Number.isNaN(base.getTime())) return NextResponse.json({ error: "invalid dt" }, { status: 400 });

    const DINE_MIN_MS = Number(process.env.NEXT_PUBLIC_DINE_MINUTES || 90) * 60 * 1000;

    const myStart = new Date(base.getTime() - DINE_MIN_MS);
    const myEnd = new Date(base.getTime() + DINE_MIN_MS);

    const fetchStart = myStart.toISOString();
    const fetchEnd = myEnd.toISOString();

    const supabase = createServiceClient();

    // ดึงเฉพาะ mapping ที่ "ยัง active" และสถานะคิวที่ส่งผลกับการกันโต๊ะ (ไม่รวม paid)
    const { data, error } = await supabase
      .from("reservation_tables")
      .select(
        `
        table_id,
        tables:table_id(table_name),
        reservations:reservation_id!inner(
          id, queue_code, reservation_datetime, status, cancelled_at
        )
      `
      )
      .neq("reservation_id", reservationId)
      .is("released_at", null) // ⬅️ แถวที่ยัง active เท่านั้น
      .is("reservations.cancelled_at", null)
      .in("reservations.status", [
        "seated", "confirmed", "confirm",
        "Seated", "Confirmed", "Confirm"
      ])
      .gte("reservations.reservation_datetime", fetchStart)
      .lte("reservations.reservation_datetime", fetchEnd);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const uniq = new Map<number, any>();

    for (const row of data ?? []) {
      const name: string = row?.tables?.table_name ?? "";
      const tableNoMatch = String(name).match(/\d+/);
      const tableNo = tableNoMatch ? Number(tableNoMatch[0]) : NaN;
      if (!Number.isFinite(tableNo)) continue;

      const otherISO: string | null = row?.reservations?.reservation_datetime ?? null;
      if (!otherISO) continue;

      const other = new Date(otherISO);
      if (Number.isNaN(other.getTime())) continue;

      const otherStart = new Date(other.getTime() - DINE_MIN_MS);
      const otherEnd = new Date(other.getTime() + DINE_MIN_MS);

      const overlap = myStart < otherEnd && otherStart < myEnd;
      if (!overlap) continue;

      if (!uniq.has(tableNo)) {
        uniq.set(tableNo, {
          tableNo,
          reservationId: row?.reservations?.id ?? null,
          queue_code: row?.reservations?.queue_code ?? null,
          reservation_datetime: otherISO,
        });
      }
    }

    return NextResponse.json(Array.from(uniq.values()), { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

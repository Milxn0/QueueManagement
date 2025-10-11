import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startISO = searchParams.get("start");
  const indexStr = searchParams.get("index");

  if (!startISO || indexStr == null) {
    return NextResponse.json(
      { error: "start/index required" },
      { status: 400 }
    );
  }
  const index = Number(indexStr);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: "invalid index" }, { status: 400 });
  }

  const toTH = (d: Date) =>
    new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const startTH = toTH(new Date(startISO));
  startTH.setDate(startTH.getDate() + index);

  const dayStartTH = new Date(
    startTH.getFullYear(),
    startTH.getMonth(),
    startTH.getDate(),
    0,
    0,
    0
  );
  const dayEndTH = new Date(dayStartTH);
  dayEndTH.setDate(dayEndTH.getDate() + 1);

  const dayStartUTC = new Date(
    Date.UTC(
      dayStartTH.getFullYear(),
      dayStartTH.getMonth(),
      dayStartTH.getDate(),
      -7,
      0,
      0,
      0
    )
  ).toISOString();
  const dayEndUTC = new Date(
    Date.UTC(
      dayEndTH.getFullYear(),
      dayEndTH.getMonth(),
      dayEndTH.getDate(),
      -7,
      0,
      0,
      0
    )
  ).toISOString();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("status")
    .gte("reservation_datetime", dayStartUTC)
    .lt("reservation_datetime", dayEndUTC)
    .in("status", ["paid", "cancel", "cancelled"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let paid = 0;
  let cancel = 0;
  for (const r of data ?? []) {
    const s = String(r.status ?? "").toLowerCase();
    if (s === "paid") paid++;
    else if (s === "cancel" || s === "cancelled") cancel++;
  }

  return NextResponse.json({ paid, cancel });
}

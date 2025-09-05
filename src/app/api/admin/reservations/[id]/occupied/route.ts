import { NextResponse } from "next/server";
import { getOccupiedAround } from "@/server/controllers/reservationsController";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const dt = searchParams.get("dt");
  if (!dt) return NextResponse.json({ error: "Missing dt" }, { status: 400 });

  const data = await getOccupiedAround(id, dt);
  return NextResponse.json(data);
}

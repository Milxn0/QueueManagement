import { NextResponse } from "next/server";
import { confirmReservation } from "@/server/controllers/reservationsController";
export const runtime = "nodejs";
export async function PATCH(
  _: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await confirmReservation(id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { listReservationsToday } from "@/server/controllers/reservationsController";

export async function GET() {
  const data = await listReservationsToday();
  return NextResponse.json(data);
}

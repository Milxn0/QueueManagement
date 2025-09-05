import { NextResponse } from "next/server";
import { getAnalytics } from "@/server/controllers/analyticsController";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") || undefined;
  const end = searchParams.get("end") || undefined;

  const result = await getAnalytics({ startISO: start, endISO: end });
  return NextResponse.json(result);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/auth-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ error: "Missing Email" }, { status: 400 });
    }
    await sendResetEmail(email.trim());
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 400 }
    );
  }
}

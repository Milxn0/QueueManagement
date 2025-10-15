/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { serverSupabase } from "@/app/api/_helpers/supabaseServer";
import { createServiceClient } from "@/lib/supabaseService";
import { genQueueCode } from "@/utils/queue";

export const runtime = "nodejs";

type CreatePayload = {
  reservation_datetime: string;
  partysize: number;
  comment?: string | null;
};

async function generateUniqueQueueCode(
  svc: ReturnType<typeof createServiceClient>
) {
  for (let i = 0; i < 8; i++) {
    const code = genQueueCode();
    const { count, error } = await svc
      .from("reservations")
      .select("id", { head: true, count: "exact" })
      .eq("queue_code", code);
    if (error) throw error;
    if (!count || count === 0) return code;
  }
  throw new Error("CANNOT_GENERATE_UNIQUE_QUEUE_CODE");
}

export async function POST(req: Request) {
  try {
    const { reservation_datetime, partysize, comment }: CreatePayload =
      await req.json();

    // 1) ตรวจ user จากคุกกี้
    const sb = await serverSupabase();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2) validate ขั้นต้น
    if (!reservation_datetime || !partysize || Number(partysize) < 1) {
      return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
    }
    const iso = new Date(reservation_datetime).toISOString();
    if (Number.isNaN(new Date(iso).getTime())) {
      return NextResponse.json({ error: "INVALID_DATETIME" }, { status: 400 });
    }

    // 3) ใช้ service client
    const svc = createServiceClient();

    // 4) gen queue_code ที่ unique
    const queue_code = await generateUniqueQueueCode(svc);

    // 5) insert reservations
    const { data: inserted, error: rErr } = await svc
      .from("reservations")
      .insert({
        user_id: user.id,
        reservation_datetime: iso,
        partysize: Number(partysize),
        comment: comment ?? null,
        status: "waiting",
        queue_code,
      })
      .select("id, queue_code")
      .single();

    if (rErr || !inserted?.id) {
      return NextResponse.json(
        { error: rErr?.message ?? "CREATE_RESERVATION_FAILED" },
        { status: 500 }
      );
    }

    // 6) insert queue_logs
    const { error: qErr } = await svc.from("queue_logs").insert({
      reservation_id: inserted.id,
      status: "waiting",
      note: "user_created",
    });
    if (qErr) {
      console.error("[queue_logs.insert] failed:", qErr);
    }

    return NextResponse.json(
      { id: inserted.id, queue_code: inserted.queue_code ?? queue_code },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[/api/user/reservations/create] failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "CREATE_RESERVATION_FAILED" },
      { status: 500 }
    );
  }
}

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushLineByUserId } from "@/app/api/_helpers/linePush";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // --- Secret check สำหรับ external cron ---
  const key =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  // ----------------------------------------

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const start = new Date(now.getTime() + 14 * 60 * 1000 - 30 * 1000);
  const end = new Date(now.getTime() + 15 * 60 * 1000 + 30 * 1000);

  const { data: rows, error } = await svc
    .from("reservations")
    .select("id, user_id, queue_code, reservation_datetime, status")
    .eq("status", "confirmed")
    .is("reminded_15m_at", null)
    .gte("reservation_datetime", start.toISOString())
    .lte("reservation_datetime", end.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const r of rows ?? []) {
    try {
      // ส่ง LINE
      const when = new Date(r.reservation_datetime).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      });
      await pushLineByUserId(r.user_id, [
        {
          type: "text",
          text: `แจ้งเตือนล่วงหน้า 15 นาที\nคิว ${r.queue_code}\nเวลา ${when}\nเจอกันนะคะ 🙂`,
        },
      ]);

      await svc
        .from("reservations")
        .update({ reminded_15m_at: new Date().toISOString() })
        .eq("id", r.id);
    } catch {
    }
  }

  return NextResponse.json({ sent: rows?.length ?? 0 });
}

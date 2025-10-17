import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushLineByUserId } from "@/app/api/_helpers/linePush";

export const runtime = "nodejs";

const TARGET_MIN_BEFORE = 15;     
const JITTER_SECONDS = 90;       

export async function GET(req: NextRequest) {
  // 1) Secret check
  const key = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2) Service client
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3) สร้างช่วงเวลา (UTC) รอบเป้า: now + 15 นาที ± jitter
  const now = new Date();
  const center = new Date(now.getTime() + TARGET_MIN_BEFORE * 60 * 1000);
  const start = new Date(center.getTime() - JITTER_SECONDS * 1000);
  const end   = new Date(center.getTime() + JITTER_SECONDS * 1000);

  // 4) ดึงรายการที่ควรส่ง
  const { data: rows, error } = await svc
    .from("reservations")
    .select("id, user_id, queue_code, reservation_datetime, status")
    .eq("status", "confirmed")
    .is("reminded_15m_at", null)
    .gte("reservation_datetime", start.toISOString())
    .lte("reservation_datetime", end.toISOString());

  if (error) {
    console.error("[cron:line-reminders] query error:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results: Array<{ id: string; sent: boolean; err?: string }> = [];

  for (const r of rows ?? []) {
    try {
      const whenTH = new Date(r.reservation_datetime).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      });

      // 5) ส่ง LINE
      await pushLineByUserId(r.user_id, [
        {
          type: "text",
          text: `แจ้งเตือนล่วงหน้า 15 นาที\nคิว ${r.queue_code}\nเวลา ${whenTH}\nเจอกันนะคะ `,
        },
      ]);

      // 6) mark ว่าส่งแล้ว — ถ้า column ไม่มี ให้ log ออกมาอย่างชัดเจน
      const { error: upErr } = await svc
        .from("reservations")
        .update({ reminded_15m_at: new Date().toISOString() })
        .eq("id", r.id);

      if (upErr) {
        console.error("[cron:line-reminders] update reminded_15m_at failed:", upErr.message);
        results.push({ id: r.id, sent: true, err: `UPDATE_FAILED:${upErr.message}` });
        continue;
      }

      results.push({ id: r.id, sent: true });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error("[cron:line-reminders] send failed:", r.id, msg);
      results.push({ id: r.id, sent: false, err: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows?.length ?? 0,
    window: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    results,
  });
}

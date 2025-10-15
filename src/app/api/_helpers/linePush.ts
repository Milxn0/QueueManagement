/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const svc = createClient(SUPABASE_URL, SERVICE_KEY);

export async function pushToLine(lineUserId: string, messages: any[]) {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });
}

export async function notifyReservationStatusChange(reservationId: string) {
  const { data: r } = await svc
    .from("reservations")
    .select("id, queue_code, status, partysize, reservation_datetime, comment, user_id")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r) return;

  const { data: links } = await svc
    .from("line_links")
    .select("line_user_id")
    .eq("user_id", r.user_id);

  if (!links?.length) return;

  const whenText = new Date(r.reservation_datetime).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });

  const message = {
    type: "flex",
    altText: `สถานะคิว ${r.queue_code} ถูกอัปเดต`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: `คิว ${r.queue_code}`, weight: "bold", size: "xl" },
          { type: "separator" },
          { type: "text", text: `สถานะ: ${statusLabel(r.status)}` },
          { type: "text", text: `จำนวนที่นั่ง: ${r.partysize}` },
          { type: "text", text: `เวลา: ${whenText}` },
          r.comment ? { type: "text", text: `หมายเหตุ: ${r.comment}` } : { type: "filler" },
        ],
      },
    },
  };

  await Promise.all(links.map(l => pushToLine(l.line_user_id, [message])));
}

function statusLabel(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("cancel")) return "ยกเลิก";
  if (v.startsWith("paid")) return "ชำระเงินแล้ว";
  if (v.startsWith("seat")) return "กำลังนั่ง";
  if (v.startsWith("confirm")) return "ยืนยันแล้ว";
  if (v.startsWith("wait")) return "กำลังรอ";
  return v || "ไม่ทราบสถานะ";
}
export async function pushLineByUserId(userId: string, messages: any[]) {
  const { data: links } = await svc
    .from("line_links")
    .select("line_user_id")
    .eq("user_id", userId);

  if (!links?.length) return;

  await Promise.all(links.map((l) => pushToLine(l.line_user_id, messages)));
}

export async function pushTextByUserId(userId: string, text: string) {
  await pushLineByUserId(userId, [{ type: "text", text }]);
}
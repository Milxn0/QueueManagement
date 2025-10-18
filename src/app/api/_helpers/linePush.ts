/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const svc = createClient(SUPABASE_URL, SERVICE_KEY);

// ---------- pushToLine ให้ตรวจ res และ log ----------
export async function pushToLine(lineUserId: string, messages: any[]) {
  if (!lineUserId) {
    console.error("[LINE push] missing lineUserId");
    return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    console.error("[LINE push] empty messages");
    return;
  }
  if (!LINE_TOKEN) {
    console.error("[LINE push] missing LINE_CHANNEL_ACCESS_TOKEN");
    return;
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[LINE push] FAILED", res.status, text);
    throw new Error(`LINE push failed: ${res.status} ${text}`);
  } else {
    console.log("[LINE push] OK ->", lineUserId);
  }
}

// ---------- KEEP: status label ----------
function statusLabel(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("cancel")) return "ยกเลิก";
  if (v.startsWith("paid")) return "ชำระเงินแล้ว";
  if (v.startsWith("seat")) return "กำลังนั่ง";
  if (v.startsWith("confirm")) return "ยืนยันแล้ว";
  if (v.startsWith("wait")) return "กำลังรอ";
  return v || "ไม่ทราบสถานะ";
}

// ----------  notify ให้ log จำนวน recipients + result ----------
export async function notifyReservationStatusChange(reservationId: string) {
  const { data: r, error: rErr } = await svc
    .from("reservations")
    .select(
      "id, queue_code, status, partysize, reservation_datetime, comment, user_id"
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (rErr) {
    console.error("[LINE notify] reservation query error:", rErr.message);
    return;
  }
  if (!r) {
    console.warn("[LINE notify] reservation not found:", reservationId);
    return;
  }

  const { data: links, error: lErr } = await svc
    .from("line_links")
    .select("line_user_id")
    .eq("user_id", r.user_id);

  if (lErr) {
    console.error("[LINE notify] links query error:", lErr.message);
    return;
  }
  if (!links?.length) {
    console.warn("[LINE notify] no linked LINE for user:", r.user_id);
    return;
  }

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
          r.comment
            ? { type: "text", text: `หมายเหตุ: ${r.comment}` }
            : { type: "filler" },
        ],
      },
    },
  };

  console.log(
    `[LINE notify] send to ${links.length} recipient(s) for reservation ${r.id} (${r.queue_code})`
  );

  for (const l of links) {
    try {
      await pushToLine(l.line_user_id, [message]);
    } catch (e: any) {
      console.error(
        "[LINE notify] push failed:",
        l.line_user_id,
        e?.message ?? e
      );
    }
  }
}


export async function pushLineByUserId(userId: string, messages: any[]) {
  const { data: links, error } = await svc
    .from("line_links")
    .select("line_user_id")
    .eq("user_id", userId);

  if (error) {
    console.error("[LINE pushByUser] links query error:", error.message);
    return;
  }
  if (!links?.length) {
    console.warn("[LINE pushByUser] no linked LINE for user:", userId);
    return;
  }
  for (const l of links) {
    try {
      await pushToLine(l.line_user_id, messages);
    } catch (e: any) {
      console.error(
        "[LINE pushByUser] push failed:",
        l.line_user_id,
        e?.message ?? e
      );
    }
  }
}
export async function notifyReservationCreated(reservationId: string) {
  const { data: r, error: rErr } = await svc
    .from("reservations")
    .select("id, queue_code, reservation_datetime, partysize, comment, user_id, status")
    .eq("id", reservationId)
    .maybeSingle();

  if (rErr || !r) return;

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

  const msg = {
    type: "flex",
    altText: `สร้างการจองใหม่ ${r.queue_code}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "สร้างการจองใหม่", weight: "bold", size: "md" },
          { type: "text", text: `คิว ${r.queue_code}`, weight: "bold", size: "xl" },
          { type: "separator" },
          { type: "text", text: `วันเวลา: ${whenText}` },
          { type: "text", text: `จำนวน: ${r.partysize} คน` },
          r.comment ? { type: "text", text: `หมายเหตุ: ${r.comment}` } : { type: "filler" },
          { type: "text", text: `สถานะปัจจุบัน: ${statusLabel(r.status)}` },
        ],
      },
    },
  };

  for (const l of links) {
    try {
      await pushToLine(l.line_user_id, [msg]);
    } catch (e) {
      console.error("[notify created] push fail:", l.line_user_id, (e as Error).message);
    }
  }
}
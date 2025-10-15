/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { hmacSign } from "@/lib/line";
export const runtime = "nodejs";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifySignature(rawBody: string, signature: string) {
  const mac = crypto
    .createHmac("sha256", CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  return mac === signature;
}
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

async function reply(replyToken: string, messages: any[]) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

const QUEUE_RE = /\bQ-?[A-Z0-9]{4,12}\b/i;
const OTP_RE = /^\d{6}$/;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // ตรวจลายเซ็น (LINE ใช้ HMAC SHA256)
    const sig = req.headers.get("x-line-signature") || "";
    if (!verifySignature(rawBody, sig)) {
      return new NextResponse("Bad signature", { status: 401 });
    }

    const { events = [] } = JSON.parse(rawBody);

    for (const ev of events) {
      if (ev.type !== "message" || ev.message.type !== "text") continue;

      const replyToken = ev.replyToken as string;
      const text = (ev.message.text as string).trim();
      const lineUserId = ev.source?.userId as string;

      // 1) ผู้ใช้ส่ง OTP
      if (OTP_RE.test(text)) {
        const otp = text;

        const { data: sess } = await supabase
          .from("line_link_sessions")
          .select(
            "id, code, attempts, expires_at, user_id, reservation_id, verified_at, purpose"
          )
          .eq("line_user_id", lineUserId)
          .eq("purpose", "otp")
          .is("verified_at", null)
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sess) {
          await reply(replyToken, [
            { type: "text", text: "ไม่พบคำขอยืนยัน หรือ OTP หมดอายุแล้ว" },
          ]);
          continue;
        }

        const now = new Date();
        if (new Date(sess.expires_at) < now) {
          await reply(replyToken, [
            { type: "text", text: "OTP หมดอายุ กรุณาเริ่มใหม่" },
          ]);
          continue;
        }

        if (sess.code !== otp) {
          await supabase
            .from("line_link_sessions")
            .update({ attempts: (sess.attempts ?? 0) + 1 })
            .eq("id", sess.id);
          await reply(replyToken, [
            { type: "text", text: "รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง" },
          ]);
          continue;
        }

        // ถูกต้อง → ผูก line_user_id กับ user_id
        await supabase.from("line_links").upsert({
          line_user_id: lineUserId,
          user_id: sess.user_id,
          linked_at: now.toISOString(),
        });

        await supabase
          .from("line_link_sessions")
          .update({ verified_at: now.toISOString() })
          .eq("id", sess.id);

        await reply(replyToken, [
          {
            type: "text",
            text: "ยืนยันตัวตนสำเร็จ! พิมพ์ Queue Code เพื่อดูรายละเอียดได้เลย",
          },
        ]);
        continue;
      }

      // 2) ผู้ใช้ส่ง Queue Code
      const match = text.match(QUEUE_RE);
      if (match) {
        const queueCode = match[0].toUpperCase();

        // ถ้าผูกแล้ว → แสดงรายละเอียดทันที
        const { data: link } = await supabase
          .from("line_links")
          .select("user_id")
          .eq("line_user_id", lineUserId)
          .maybeSingle();

        if (link?.user_id) {
          const { data: resv } = await supabase
            .from("reservations")
            .select(
              "id, queue_code, reservation_datetime, partysize, status, comment, user_id"
            )
            .eq("queue_code", queueCode)
            .maybeSingle();

          if (!resv || resv.user_id !== link.user_id) {
            await reply(replyToken, [
              { type: "text", text: "ไม่พบการจองนี้ในบัญชีของคุณ" },
            ]);
            continue;
          }

          await reply(replyToken, [flexReservation(resv)]);
          continue;
        }

        // ยังไม่ผูก → ออกลิงก์ยืนยัน
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const nonce = crypto.randomBytes(16).toString("hex");

        const { data: tokenRow, error } = await supabase
          .from("line_link_sessions")
          .insert({
            purpose: "link",
            line_user_id: lineUserId,
            queue_code: queueCode,
            nonce,
            expires_at: expiresAt,
          })
          .select("id")
          .single();

        if (error || !tokenRow) {
          await reply(replyToken, [
            { type: "text", text: "มีข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" },
          ]);
          continue;
        }

        const payload = `${tokenRow.id}.${nonce}`;
        const sig2 = hmacSign(payload);
        const linkUrl = `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/user/line/link?token=${encodeURIComponent(payload)}&sig=${sig2}`;

        await reply(replyToken, [
          {
            type: "text",
            text: "โปรดยืนยันตัวตนก่อนดูรายละเอียด: กดลิงก์เพื่อล็อกอินระบบ จากนั้นรับ OTP แล้วส่งกลับในแชทนี้",
          },
          {
            type: "template",
            altText: "ยืนยันตัวตน",
            template: {
              type: "buttons",
              title: "ยืนยันตัวตน",
              text: "เข้าสู่ระบบเพื่อรับ OTP",
              actions: [
                { type: "uri", label: "กดยืนยัน/ล็อกอิน", uri: linkUrl },
              ],
            },
          },
        ]);
        continue;
      }

      // 3) ข้อความอื่น ๆ
      await reply(replyToken, [
        {
          type: "text",
          text: "พิมพ์ Queue Code (เช่น Q-AB12CD) หรือส่ง OTP 6 หลัก",
        },
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("LINE webhook error:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
function flexReservation(r: any) {
  return {
    type: "flex",
    altText: `รายละเอียดคิว ${r.queue_code}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: `คิว ${r.queue_code}`,
            weight: "bold",
            size: "xl",
          },
          { type: "separator" },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: `สถานะ: ${r.status}` },
              { type: "text", text: `จำนวนที่นั่ง: ${r.partysize}` },
              {
                type: "text",
                text: `เวลา: ${new Date(r.reservation_datetime).toLocaleString(
                  "th-TH",
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Bangkok",
                  }
                )}`,
              },
              r.comment
                ? { type: "text", text: `หมายเหตุ: ${r.comment}` }
                : { type: "filler" },
            ],
          },
        ],
      },
    },
  };
}

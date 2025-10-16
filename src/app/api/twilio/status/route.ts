import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let params: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const fd = await req.formData();
      params = Object.fromEntries(
        Array.from(fd.entries()).map(([k, v]) => [k, String(v)])
      );
    } else {
      params = (await req.json().catch(() => ({}))) ?? {};
    }

    const token = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.headers.get("x-twilio-signature") || "";

    if (token) {
      const ok = twilio.validateRequest(token, signature, req.url, params);
      if (!ok) {
        return NextResponse.json(
          { error: "invalid_signature" },
          { status: 403 }
        );
      }
    }

    const message = {
      messageSid: params.MessageSid || params.SmsSid || "",
      messageStatus: params.MessageStatus || params.SmsStatus || "",
      to: params.To || "",
      from: params.From || "",
      errorCode: params.ErrorCode || "",
      errorMessage: params.ErrorMessage || "",
      raw: params,
    };

    console.log("[twilio:status]", message);

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    console.error("[twilio:status] error", e);
    return new NextResponse(null, { status: 204 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "twilio/status" });
}

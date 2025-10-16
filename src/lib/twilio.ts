import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_MESSAGING_SERVICE_SID,
  TWILIO_FROM,
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  throw new Error("Missing Twilio credentials");
}
if (!TWILIO_MESSAGING_SERVICE_SID && !TWILIO_FROM) {
  throw new Error("Configure TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM");
}

export const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
function toE164(phone: string, defaultCountry: "TH" | null = "TH") {
  const digits = phone.replace(/\D/g, "");

  if (phone.trim().startsWith("+") && /^\+\d{9,15}$/.test(phone.trim())) {
    return phone.trim();
  }

  if (defaultCountry === "TH") {
    if (/^0\d{9}$/.test(digits)) {
      return `+66${digits.slice(1)}`;
    }
    if (/^66\d{8,12}$/.test(digits)) {
      return `+${digits}`;
    }
  }

  if (/^\d{9,15}$/.test(digits)) {
    return `+${digits}`;
  }

  throw new Error("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็น E.164)");
}
export async function sendSMS(to: string, body: string) {
  if (TWILIO_MESSAGING_SERVICE_SID) {
    return twilioClient.messages.create({
      to,
      body,
      messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
    });
  }
  return twilioClient.messages.create({ to, body, from: TWILIO_FROM! });
}

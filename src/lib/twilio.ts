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

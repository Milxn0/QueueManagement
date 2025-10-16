import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
  throw new Error("Missing Twilio envs");
}

export const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export async function sendSMS(to: string, body: string) {
  return twilioClient.messages.create({ to, from: TWILIO_FROM!, body });
}

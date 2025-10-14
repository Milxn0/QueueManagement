import crypto from "crypto";

const LINK_SECRET = process.env.LINE_LINK_SECRET!;

export function hmacSign(payload: string) {
  return crypto.createHmac("sha256", LINK_SECRET).update(payload).digest("hex");
}

export function hmacVerify(payload: string, sig: string) {
  const exp = hmacSign(payload);
  const a = Buffer.from(exp);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

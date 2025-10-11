import { createClient } from "@/lib/supabaseClient";

export function genOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** สร้างและบันทึก OTP ลงฐานข้อมูล แล้วคืนค่า code  */
export async function createOTP(phone: string) {
  const supabase = createClient();
  const code = genOTP();
  const { error } = await supabase.from("otp_verifications").insert({
    phone,
    otp_code: code,
  });
  if (error) throw error;
  return code;
}

/** ตรวจ OTP ล่าสุดของหมายเลขโทรศัพท์ */
export async function verifyOTP(phone: string, code: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("otp_verifications")
    .select("*")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  const latest = data?.[0] as { otp_code?: string } | undefined;
  if (!latest) return false;
  return String(latest.otp_code ?? "") === String(code ?? "");
}

import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น เพื่ออ่าน session จาก cookie ของผู้เรียก
 * (ใช้ตรวจสิทธิ์ว่าเป็น admin ฯลฯ)
 */
export async function createServerAuthedClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // เวอร์ชันใหม่ของ @supabase/ssr
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );
}

/**
 * ใช้ Service Role Key สำหรับทำงานหลังบ้าน (เช่น แอดมินแก้ข้อมูลผู้อื่น)
 * ห้าม import ใช้จากฝั่ง client เด็ดขาด
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

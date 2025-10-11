/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { listReservationsToday } from "@/server/controllers/reservationsController";
export const runtime = "nodejs";
async function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (service) {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const cookieStore = await cookies();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

// ---------- GET ----------
export async function GET() {
  try {
    const rows = await listReservationsToday();
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("GET /api/admin/reservations/today failed:", e?.message ?? e);
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }
}

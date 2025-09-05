// src/server/controllers/reservationsController.ts
"use server";
import "server-only";
import { createServiceClient } from "@/lib/supabaseService";

export async function listReservationsToday() {
  const supabase = createServiceClient();
  // เทียบ logic เดิมใน page.tsx บรรทัด 70–92
  // ควรคง fields เดิมให้ครบ
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, user_id, reservation_datetime, partysize, queue_code, status, created_at, table_id,
      user:users!reservations_user_id_fkey(name, phone, email),
      cancelled_at, cancelled_reason,
      cancelled_by:users!reservations_cancelled_by_user_id_fkey(name, role),
      tbl:tables!reservations_table_id_fkey(table_name)
    `
    )
    .gte("reservation_datetime", start.toISOString())
    .lte("reservation_datetime", end.toISOString())
    .order("reservation_datetime", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function confirmReservation(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("reservations")
    .update({ status: "confirmed" })
    .eq("id", id);
  if (error) throw error;
}

export async function getOccupiedAround(
  reservationId: string,
  baseISO: string
) {
  const supabase = createServiceClient();
  const base = new Date(baseISO).getTime();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const start = new Date(base - TWO_HOURS_MS).toISOString();
  const end = new Date(base + TWO_HOURS_MS).toISOString();

  const { data, error } = await supabase
    .from("reservations")
    .select(
      `id, queue_code, reservation_datetime, tbl:tables!reservations_table_id_fkey(table_name)`
    )
    .not("table_id", "is", null)
    .neq("id", reservationId)
    .gte("reservation_datetime", start)
    .lte("reservation_datetime", end);

  if (error) throw error;
  return data ?? [];
}

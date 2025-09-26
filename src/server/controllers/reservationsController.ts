/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabaseService";

export type UserReservationRow = {
  id: string;
  reservation_datetime: string | null;
  queue_code: string | null;
  partysize: number | string | null;
  status: string | null;
  tbl?: { table_name: string | null } | null;
};

// สถานะการจอง
const waiting_STATUSES = ["waiting"];
const CONFIRMED_STATUSES = ["confirmed", "seated", "completed"];
const CANCELLED_STATUSES = ["cancelled", "no_show"];


export async function listReservationsToday() {
  const supabase = createServiceClient();
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

  if (error) {
    throw error;
  }
  return data ?? [];
}


export async function confirmReservation(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("reservations")
    .update({ status: "confirmed" })
    .eq("id", id);
    
  if (error) {
    throw error;
  }
  

  revalidatePath("/");
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
    .eq("status", "seated")
    .gte("reservation_datetime", start)
    .lte("reservation_datetime", end);

  if (error) {
    throw error;
  }
  return data ?? [];
}


export async function listReservationsByUser(sb: unknown, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id,
      reservation_datetime,
      queue_code,
      partysize,
      status,
      tbl:tables(table_name)
      `
    )
    .eq("user_id", userId)
    .order("reservation_datetime", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[listReservationsByUser]", error);
    return [] as UserReservationRow[];
  }
  return (data ?? []) as unknown as UserReservationRow[];
}


export async function listUserwaitingReservations(sb: unknown, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("id, reservation_datetime, status, queue_code")
    .eq("user_id", userId)
    .in("status", [...waiting_STATUSES, ...CONFIRMED_STATUSES])
    .order("reservation_datetime", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[listUserwaitingReservations]", error);
    return [];
  }
  return data ?? [];
}


export async function checkUserReservationQuota(
  userId: string,
  dayISO: string,
  limitPerDay = 1
) {
  const supabase = createServiceClient();
  const d = new Date(dayISO);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const { count, error } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("reservation_datetime", start.toISOString())
    .lte("reservation_datetime", end.toISOString())
    .in("status", [...waiting_STATUSES, ...CONFIRMED_STATUSES]);

  if (error) {
    console.error("[checkUserReservationQuota]", error);
    return { ok: true, used: 0, limit: limitPerDay };
  }

  const used = count ?? 0;
  return { ok: used < limitPerDay, used, limit: limitPerDay };
}
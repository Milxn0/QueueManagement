/* eslint-disable @typescript-eslint/no-explicit-any */
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
  comment: string | null;
  status: string | null;
  tbl?: { table_name: string | null } | null;
};

const waiting_STATUSES = ["waiting"];
const CONFIRMED_STATUSES = ["confirmed", "seated"];
const CANCELLED_STATUSES = ["cancelled"];

function todayBangkokRangeUTC() {
  const nowTH = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = nowTH.getFullYear();
  const m = nowTH.getMonth();
  const d = nowTH.getDate();
  const startUTC = new Date(Date.UTC(y, m, d, -7, 0, 0));
  const endUTC = new Date(Date.UTC(y, m, d + 1, -7, 0, 0));
  const toIsoNoMs = (dt: Date) => dt.toISOString().replace(/\.\d{3}Z$/, "Z");
  return { startISO: toIsoNoMs(startUTC), endISO: toIsoNoMs(endUTC) };
}

function bangkokDayRangeUTC(dayISO: string) {
  const baseTH = new Date(
    new Date(dayISO).toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = baseTH.getFullYear();
  const m = baseTH.getMonth();
  const d = baseTH.getDate();
  const startUTC = new Date(Date.UTC(y, m, d, -7, 0, 0));
  const endUTC = new Date(Date.UTC(y, m, d + 1, -7, 0, 0));
  const toIsoNoMs = (dt: Date) => dt.toISOString().replace(/\.\d{3}Z$/, "Z");
  return { startISO: toIsoNoMs(startUTC), endISO: toIsoNoMs(endUTC) };
}

export async function listReservationsToday() {
  const supabase = createServiceClient();
  const { startISO, endISO } = todayBangkokRangeUTC();

  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, user_id, reservation_datetime, partysize, queue_code, comment, status, created_at, table_id,
      user:users!reservations_user_id_fkey(name, phone, email),
      cancelled_at, cancelled_reason,
      cancelled_by:users!reservations_cancelled_by_user_id_fkey(name, role),
      tbl:tables!reservations_table_id_fkey(table_name)
    `
    )
    .gte("reservation_datetime", startISO)
    .lte("reservation_datetime", endISO)
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
  revalidatePath("/");
}

export async function getOccupiedAround(
  reservationId: string,
  baseISO: string
) {
  const supabase = createServiceClient();

  const base = new Date(baseISO);
  if (Number.isNaN(base.getTime())) throw new Error("Invalid baseISO");

  const DINE_MIN_MS = 90 * 60 * 1000;

  const myStart = new Date(base.getTime() - DINE_MIN_MS);
  const myEnd = new Date(base.getTime() + DINE_MIN_MS);

  const fetchStart = new Date(base.getTime() - DINE_MIN_MS).toISOString();
  const fetchEnd = new Date(base.getTime() + DINE_MIN_MS).toISOString();

  const { data, error } = await supabase
    .from("reservation_tables")
    .select(
      `
      table_id,
      tables:table_id(table_name),
      reservations:reservation_id!inner(
        id,
        queue_code,
        reservation_datetime,
        status,
        cancelled_at
      )
    `
    )
    .neq("reservation_id", reservationId)
    .is("reservations.cancelled_at", null)
    .in("reservations.status", [
      "seated",
      "confirmed",
      "confirm",
      "Seated",
      "Confirmed",
      "Confirm",
    ])
    .gte("reservations.reservation_datetime", fetchStart)
    .lte("reservations.reservation_datetime", fetchEnd);

  if (error) throw error;

  const uniq = new Map<number, any>();
  for (const row of data ?? []) {
    // รองรับ tables เป็น object หรือ array
    const name: string = Array.isArray((row as any)?.tables)
      ? (row as any).tables?.[0]?.table_name ?? ""
      : (row as any)?.tables?.table_name ?? "";

    const tableNo = Number(String(name).match(/\d+/)?.[0] ?? NaN);
    if (!Number.isFinite(tableNo)) continue;

    const rsv = Array.isArray((row as any)?.reservations)
      ? (row as any).reservations?.[0]
      : (row as any).reservations;

    const otherISO: string | null = rsv?.reservation_datetime ?? null;
    const other = otherISO ? new Date(otherISO) : null;
    if (!other || Number.isNaN(other.getTime())) continue;

    const otherStart = new Date(other.getTime() - DINE_MIN_MS);
    const otherEnd = new Date(other.getTime() + DINE_MIN_MS);

    const overlap = myStart < otherEnd && otherStart < myEnd;
    if (!overlap) continue;

    if (!uniq.has(tableNo)) {
      uniq.set(tableNo, {
        tableNo,
        reservationId: rsv?.id ?? null,
        queue_code: rsv?.queue_code ?? null,
        reservation_datetime: otherISO ?? null,
      });
    }
  }

  return Array.from(uniq.values());
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
      comment,
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
    .select("id, reservation_datetime, status, queue_code, comment")
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
  const { startISO, endISO } = bangkokDayRangeUTC(dayISO);

  const { count, error } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("reservation_datetime", startISO)
    .lte("reservation_datetime", endISO)
    .in("status", [...waiting_STATUSES, ...CONFIRMED_STATUSES]);

  if (error) {
    console.error("[checkUserReservationQuota]", error);
    return { ok: true, used: 0, limit: limitPerDay };
  }

  const used = count ?? 0;
  return { ok: used < limitPerDay, used, limit: limitPerDay };
}

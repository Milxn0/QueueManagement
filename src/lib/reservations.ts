import { supabase } from "@/lib/supabaseClient";
import { tableNameFromNo } from "@/utils/tables";
import { genQueueCode } from "@/utils/queue";

export async function findTableIdByNo(no: number) {
  const { data, error } = await supabase
    .from("tables")
    .select("id, table_name")
    .eq("table_name", tableNameFromNo(no))
    .limit(1)
    .single();
  if (error || !data?.id) throw new Error(`ไม่พบโต๊ะหมายเลข ${no}`);
  return data.id as string;
}

export async function assignTable(reservationId: string, tableNo: number) {
  const tableId = await findTableIdByNo(tableNo);
  const { error } = await supabase
    .from("reservations")
    .update({ table_id: tableId, status: "seated"})
    .eq("id", reservationId);
  if (error) throw error;
}

export async function moveTable(reservationId: string, toNo: number) {
  const tableId = await findTableIdByNo(toNo);
  const { error } = await supabase
    .from("reservations")
    .update({ table_id: tableId, status: "seated" })
    .eq("id", reservationId);
  if (error) throw error;
}

export async function updateReservationByUser(
  reservationId: string,
  userId: string,
  newReservationISO: string,
  newPartySize: number,
  newComment: string,
) {
  const { error: upErr } = await supabase
    .from("reservations")
    .update({
      reservation_datetime: newReservationISO,
      partysize: newPartySize,
      comment: newComment,
    })
    .eq("id", reservationId)
    .eq("user_id", userId);
  if (upErr) throw upErr;
}

export async function cancelReservationByUser(
  reservationId: string,
  userId: string
) {
  const { error: upErr } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservationId)
    .eq("user_id", userId)
    .select()
    .single();
  if (upErr) throw upErr;
}

// insert เพิ
export async function insertReservationWithRetries(
  userId: string,
  reservationISO: string,
  partySize: number,
  comment: string
) {
  const MAX_RETRY = 5;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    const queue_code = genQueueCode();
    const { error } = await supabase.from("reservations").insert({
      user_id: userId,
      reservation_datetime: reservationISO,
      comment: comment,
      partysize: partySize,
      queue_code,
      status: "waiting",
    });
    if (!error) return queue_code;
    if (
      String(error?.message || "")
        .toLowerCase()
        .includes("duplicate") &&
      attempt < MAX_RETRY
    ) {
      continue;
    }
    if (attempt === MAX_RETRY) throw error ?? new Error("insert failed");
  }
  throw new Error("ไม่สามารถบันทึกการจองได้ (queue_code ซ้ำหลายครั้ง)");
}

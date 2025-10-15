import { createClient } from "@/lib/supabaseClient";
import { tableNameFromNo } from "@/utils/tables";
import { genQueueCode } from "@/utils/queue";
const supabase = createClient();
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


export async function insertReservationWithRetries(
  userId: string,
  reservationISO: string,
  partySize: number,
  comment: string
) {
  const res = await fetch("/api/user/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userId,
      reservationISO,
      partySize,
      comment,
    }),
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const msg = (payload && payload.error) || "สร้างการจองไม่สำเร็จ";
    throw new Error(msg);
  }

  const queue = payload?.queue_code || payload?.queueCode || null;
  if (!queue) throw new Error("ไม่พบรหัสคิวที่สร้างจากเซิร์ฟเวอร์");
  return String(queue);
}

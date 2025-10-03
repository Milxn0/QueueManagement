import type { Row } from "@/types/analytics";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listReservationRows(
  supabase: SupabaseClient,
  range: { start: string; end: string }
): Promise<Row[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("id,reservation_datetime,status")
    .gte("reservation_datetime", range.start)
    .lte("reservation_datetime", range.end)
    .order("reservation_datetime", { ascending: true })
    .limit(5000);

  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { csvEscape } from "@/utils/analytics/csv";
import { formatBangkok, makeRangeISO } from "@/utils/date";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExportMode } from "@/types/analytics";

export async function exportReservationsCSV(
  supabase: SupabaseClient,
  m: ExportMode,
  d: string,
  mo: string,
  y: string,
  setExporting?: (v: boolean) => void
) {
  const { start, end, label } = makeRangeISO(m, d, mo, y);
  setExporting?.(true);
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id, reservation_datetime, status, partysize, queue_code,
        user:users!reservations_user_id_fkey(name, phone, email)
      `)
      .gte("reservation_datetime", start)
      .lte("reservation_datetime", end)
      .order("reservation_datetime", { ascending: true });

    if (error) {
      alert(`ไม่สามารถส่งออกได้: ${error.message}`);
      return;
    }

    const list = (data ?? []) as any[];
    if (!list.length) {
      alert("ไม่มีรายการในช่วงเวลาที่เลือก");
      return;
    }

    const headers = [
      "Queue Code",
      "Date / Time",
      "Status",
      "Partysize",
      "Name",
      "Phone",
      "Email",
      "Reservation ID",
    ];

    const lines = list.map((r) =>
      [
        r.queue_code ?? "",
        formatBangkok(r.reservation_datetime),
        r.status ?? "",
        r.partysize ?? "",
        r.user?.name ?? "",
        r.user?.phone ? `'${r.user.phone}` : "",
        r.user?.email ?? "",
        r.id,
      ]
        .map(csvEscape)
        .join(",")
    );

    const csv = ["sep=,", headers.join(","), ...lines].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations_${m}_${label}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } finally {
    setExporting?.(false);
  }
}

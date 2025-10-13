/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export type AssignedTable = { id: string; name: string; no: number | null };

const getNo = (name?: string | null) => {
  const m = String(name ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
};

export function useAssignedTables(reservationId?: string | null) {
  const supabase = createClient();
  const [assigned, setAssigned] = useState<AssignedTable[]>([]);

  const load = useCallback(async () => {
    if (!reservationId) return;
    const { data, error } = await supabase
      .from("reservation_tables")
      .select("table_id, tables:table_id(id, table_name)")
      .eq("reservation_id", reservationId);

    if (!error) {
      const items = (data ?? [])
        .map((r: any) => r.tables)
        .filter(Boolean)
        .map((t: any) => ({
          id: t.id as string,
          name: String(t.table_name ?? ""),
          no: getNo(t.table_name),
        }))
        .sort((a: any, b: any) => (a.no ?? 0) - (b.no ?? 0));
      setAssigned(items);
    } else {
      setAssigned([]);
    }
  }, [reservationId, supabase]);

  return { assigned, load };
}

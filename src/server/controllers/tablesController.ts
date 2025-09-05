"use server";
import "server-only";
import { createServiceClient } from "@/lib/supabaseService";

export async function findTableIdByNo(no: number) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tables")
    .select("id, table_name")
    .eq("table_name", `โต๊ะ ${no}`)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

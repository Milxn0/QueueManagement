import { createClient } from "@supabase/supabase-js";
import type { Menu } from "@/types/menu";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getMenus(): Promise<Menu[]> {
  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addMenu(menu: Omit<Menu, "id" | "created_at">) {
  const { data, error } = await supabase.from("menus").insert([menu]);
  if (error) throw error;
  return data;
}

export async function updateMenu(id: string, menu: Partial<Menu>) {
  const { data, error } = await supabase.from("menus").update(menu).eq("id", id);
  if (error) throw error;
  return data;
}

export async function deleteMenu(id: string) {
  const { error } = await supabase.from("menus").delete().eq("id", id);
  if (error) throw error;
}

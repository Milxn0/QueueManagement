/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabaseClient";

export type AppSettings = {
  id: number;
  is_system_open: boolean;
  open_time: string;
  close_time: string; 
  days_ahead: number;
  store_name: string | null;
  store_image_url: string | null;
  contact_phone: string | null;
  contact_ig: string | null;
  contact_facebook: string | null;
  menu_url: string | null;
  updated_at: string | null; 
};

async function fetchAppSettings(): Promise<AppSettings> {
  const supabase = createServiceClient(); 
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: data.id ?? 1,
    is_system_open: !!data.is_system_open,
    open_time: data.open_time ?? "09:00",
    close_time: data.close_time ?? "21:00",
    days_ahead: data.days_ahead ?? 30,
    store_name: data.store_name ?? null,
    store_image_url: data.store_image_url ?? null,
    contact_phone: data.contact_phone ?? null,
    contact_ig: data.contact_ig ?? null,
    contact_facebook: data.contact_facebook ?? null,
    menu_url: data.menu_url ?? null,
    updated_at: data.updated_at ?? null,
  };
}

export const getAppSettings = unstable_cache(
  async () => await fetchAppSettings(),
  ["app_settings"],
  { revalidate: 300, tags: ["app_settings"] }
);

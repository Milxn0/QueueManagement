"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type AppSettings = {
  id: number;
  is_system_open: boolean | null;
  open_time: string | null;    
  close_time: string | null;   
  days_ahead: number | null;
  store_name: string | null;
  store_image_url: string | null;
  contact_phone: string | null;
  contact_ig: string | null;
  contact_facebook: string | null;
  menu_url: string | null;
  updated_at?: string | null;
};

const DEFAULTS: AppSettings = {
  id: 1,
  is_system_open: true,
  open_time: "09:00",
  close_time: "21:00",
  days_ahead: 30,
  store_name: null,
  store_image_url: null,
  contact_phone: null,
  contact_ig: null,
  contact_facebook: null,
  menu_url: null,
  updated_at: null,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setSettings(DEFAULTS);
    } else {
      setSettings((data as AppSettings) ?? DEFAULTS);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return { settings, loading, error, reload: load };
}

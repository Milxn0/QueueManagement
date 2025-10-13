"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export type AppSettings = {
  days_ahead: number;
  open_time: string;
  close_time: string;
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("days_ahead, open_time, close_time")
          .eq("id", 1)
          .single();
        if (data) setSettings(data as AppSettings);
      } catch {
        setSettings(null);
      }
    })();
  }, []);

  return settings;
}

"use client";

import { useEffect, useState } from "react";
import { useSettings, type AppSettings } from "@/hooks/useSettings";
import { createClient } from "@/lib/supabaseClient";

type Props<K extends keyof AppSettings = keyof AppSettings> = {
  keyName: K;
  className?: string;
  prefix?: string;
  suffix?: string;
  loadingPlaceholder?: React.ReactNode;
  format?: (value: AppSettings[K]) => React.ReactNode;
};

export default function AppSettingText<K extends keyof AppSettings>({
  keyName,
  className,
  prefix,
  suffix,
  loadingPlaceholder = null,
  format,
}: Props<K>) {
  const { settings } = useSettings();
  const [fallback, setFallback] = useState<AppSettings[K] | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  const cur = settings?.[keyName] as AppSettings[K] | undefined;
  if (cur === undefined || cur === null || String(cur) === "") {
    setLoading(true);
    (async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("app_settings")
          .select(String(keyName))
          .eq("id", 1)
          .maybeSingle();

        if (!error && data) {
          setFallback(
            (data[String(keyName)] ?? undefined) as AppSettings[K] | undefined
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }
}, [settings, keyName]);

  const val =
    (settings?.[keyName] as AppSettings[K] | undefined) ??
    (fallback as AppSettings[K] | undefined);

  if (val === undefined || val === null || String(val) === "") {
    return (
      <span className={className}>{loading ? loadingPlaceholder : null}</span>
    );
  }

  const content = format ? format(val) : String(val);

  return (
    <span className={className}>
      {prefix}
      {content}
      {suffix}
    </span>
  );
}

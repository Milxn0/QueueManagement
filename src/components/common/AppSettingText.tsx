"use client";
import { useSettings, type AppSettings } from "@/hooks/useSettings";

type Props<K extends keyof AppSettings = keyof AppSettings> = {
  keyName: K;
  className?: string;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  loadingPlaceholder?: React.ReactNode;
  format?: (value: AppSettings[K]) => React.ReactNode;
};

export default function AppSettingText<K extends keyof AppSettings>({
  keyName,
  className,
  prefix,
  suffix,
  placeholder = "-",
  loadingPlaceholder = "…",
  format,
}: Props<K>) {
  const { settings, loading } = useSettings();
  if (loading) return <span className={className}>{loadingPlaceholder}</span>;
  const val = settings?.[keyName];
  const content = format
    ? format(val as AppSettings[K])
    : val == null || val === ""
    ? placeholder
    : String(val);
  return (
    <span className={className}>
      {prefix}
      {content}
      {suffix}
    </span>
  );
}

import type { AnalyticsResult } from "@/types/analytics";

export async function getAnalytics(range: { start: string; end: string }) {
  const qs = new URLSearchParams({ start: range.start, end: range.end });
  const res = await fetch(`/api/admin/analytics?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Analytic failed");
  return (await res.json()) as AnalyticsResult;
}

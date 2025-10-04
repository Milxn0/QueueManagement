import type {
  AnalyticsResult,
  UsersDailyRow,
  DailyByName,
} from "@/types/analytics";

export async function getAnalytics(range: { start: string; end: string }) {
  const qs = new URLSearchParams({ start: range.start, end: range.end });
  const res = await fetch("/api/admin/analytics?" + qs.toString(), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Analytic failed");
  return (await res.json()) as AnalyticsResult;
}

export async function getUserDaily(range: { start: string; end: string }) {
  const qs = new URLSearchParams({ start: range.start, end: range.end });
  const res = await fetch("/api/admin/analytics/users-daily?" + qs.toString(), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("users-daily failed");
  return (await res.json()) as UsersDailyRow[];
}

export async function getUserDailyByname(params: {
  q: string;
  roles: string[];
  start: string;
  end: string;
}) {
  const url = new URL(
    "/api/admin/analytics/user-daily-by-name",
    window.location.origin
  );
  url.searchParams.set("name", params.q.trim());
  url.searchParams.set("roles", params.roles.join(","));
  url.searchParams.set("start", params.start);
  url.searchParams.set("end", params.end);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("user-daily-by-name failed");
  return (await res.json()) as DailyByName[];
}
export async function getUsersSummary() {
  const res = await fetch("/api/admin/analytics/users-summary", { cache: "no-store" });
  if (!res.ok) throw new Error("users-summary failed");
  return await res.json() as { all: number; customer: number; staff: number; admin: number };
}

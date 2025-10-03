/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { AnalyticsResult, Row } from "@/types/analytics";

type UsersDailyRow = { date: string; customer: number; staff: number };
type DailyByName = { day_th: string; visits: number };

export function useAnalytics(startISO: string, endISO: string, dataset: "reservations" | "users", name: string) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [userDaily, setUserDaily] = useState<UsersDailyRow[]>([]);
  const [byName, setByName] = useState<DailyByName[]>([]);
  const [roleTotals, setRoleTotals] = useState({ all: 0, customer: 0, staff: 0, admin: 0 });

  const fetchAnalytics = useCallback(async () => {
    const qs = new URLSearchParams({ start: startISO, end: endISO });
    const res = await fetch("/api/admin/analytics?" + qs.toString(), { cache: "no-store" });
    const json: AnalyticsResult = await res.json();
    setAnalytics(json);
  }, [startISO, endISO]);

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select("id,reservation_datetime,status")
      .gte("reservation_datetime", startISO)
      .lte("reservation_datetime", endISO)
      .order("reservation_datetime", { ascending: true })
      .limit(5000);
    if (!error) setRows((data ?? []) as Row[]);
  }, [supabase, startISO, endISO]);

  const fetchUsersOverall = useCallback(async () => {
    const qs = new URLSearchParams({ start: startISO, end: endISO });
    const res = await fetch("/api/admin/analytics/users-daily?" + qs.toString(), { cache: "no-store" });
    setUserDaily((await res.json()) as UsersDailyRow[]);
    setByName([]);
  }, [startISO, endISO]);

  const fetchUsersByName = useCallback(async (q: string) => {
    const url = new URL("/api/admin/analytics/user-daily-by-name", window.location.origin);
    url.searchParams.set("name", q.trim());
    url.searchParams.set("roles", ["customer", "staff"].join(","));
    url.searchParams.set("start", startISO);
    url.searchParams.set("end", endISO);
    const res = await fetch(url.toString(), { cache: "no-store" });
    setByName((await res.json()) as DailyByName[]);
    setUserDaily([]);
  }, [startISO, endISO]);

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);
      try {
        if (dataset === "reservations") {
          await Promise.all([fetchAnalytics(), fetchRows()]);
        } else {
          if (!name.trim()) await fetchUsersOverall();
          else await fetchUsersByName(name);
        }
      } catch (e: any) {
        setErr(e?.message ?? "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [dataset, name, fetchAnalytics, fetchRows, fetchUsersOverall, fetchUsersByName]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/analytics/users-summary", { cache: "no-store" });
      setRoleTotals(await res.json());
    })();
  }, []);

  return { loading, err, analytics, rows, userDaily, byName, roleTotals };
}

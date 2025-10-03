/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import type { AnalyticsResult, DailyByName, UsersDailyRow, Row, Dataset } from "@/types/analytics";
import { getAnalytics, getUserDailyByname, getUserDaily } from "@/app/api/admin/analytics/client";
import { listReservationRows } from "@/lib/reservationsClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export function useAnalyticsData(params: {
  supabase: SupabaseClient;
  dataset: Dataset;
  startISO: string;
  endISO: string;
  debouncedName: string;
}) {
  const { supabase, dataset, startISO, endISO, debouncedName } = params;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [userDaily, setUserDaily] = useState<UsersDailyRow[]>([]);
  const [byName, setByName] = useState<DailyByName[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const json = await getAnalytics({ start: startISO, end: endISO });
      setAnalytics(json);
    } catch (e: any) {
      setErr(e?.message ?? "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [startISO, endISO]);

  const fetchUsersOverall = useCallback(async () => {
    const json = await getUserDaily({ start: startISO, end: endISO });
    setUserDaily(Array.isArray(json) ? json : []);
    setByName([]);
  }, [startISO, endISO]);

  const fetchUsersByName = useCallback(async (q: string) => {
    const json = await getUserDailyByname({ q, roles: ["customer", "staff"], start: startISO, end: endISO });
    setByName(Array.isArray(json) ? json : []);
    setUserDaily([]);
  }, [startISO, endISO]);

  const fetchRows = useCallback(async () => {
    const list = await listReservationRows(supabase, { start: startISO, end: endISO });
    setRows(list);
  }, [supabase, startISO, endISO]);

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);
      try {
        if (dataset === "reservations") {
          await Promise.all([fetchAnalytics(), fetchRows()]);
        } else {
          if (!debouncedName.trim()) await fetchUsersOverall();
          else await fetchUsersByName(debouncedName);
        }
      } catch (e: any) {
        setErr(e?.message ?? "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [dataset, debouncedName, fetchAnalytics, fetchRows, fetchUsersOverall, fetchUsersByName]);

  return { loading, err, analytics, rows, userDaily, byName };
}

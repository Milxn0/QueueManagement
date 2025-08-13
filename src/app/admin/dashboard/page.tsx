/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

type Stat = { label: string; value: number; color: string; text: string };
type DashboardCounts = { today: number; month: number; cancelled_today: number };

export default function DashboardPage() {
  // สร้าง client ครั้งเดียว
  const supabase = useMemo(() => createClient(), []);

  // auth gate
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // stats cards
  const [stats, setStats] = useState<Stat[]>([
    { label: "จำนวนคิววันนี้", value: 0, color: "bg-blue-100", text: "text-blue-700" },
    { label: "จำนวนคิวเดือนนี้", value: 0, color: "bg-green-100", text: "text-green-700" },
    { label: "คิวไม่มาวันนี้ (cancelled)", value: 0, color: "bg-yellow-100", text: "text-yellow-700" },
  ]);

  // โหลดสถานะผู้ใช้
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsLoggedIn(!!data.user);
      setLoading(false);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setIsLoggedIn(!!s?.user));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // ดึงสถิติผ่าน RPC (รวดเดียว)
  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("dashboard_counts_tz", { tz: "Asia/Bangkok" });
    if (error || !data || !data[0]) return;

    const { today, month, cancelled_today } = data[0] as DashboardCounts;
    setStats([
      { label: "จำนวนคิววันนี้", value: today, color: "bg-blue-100", text: "text-blue-700" },
      { label: "จำนวนคิวเดือนนี้", value: month, color: "bg-green-100", text: "text-green-700" },
      { label: "คิวไม่มาวันนี้ (cancelled)", value: cancelled_today, color: "bg-yellow-100", text: "text-yellow-700" },
    ]);
  }, [supabase]);

  // realtime: ยิง refetch เมื่อมี INSERT/UPDATE/DELETE ที่ reservations
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(fetchStats, 250);
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
    const ch = supabase
      .channel("reservations-dashboard")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reservations" }, scheduleRefetch)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reservations" }, scheduleRefetch)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "reservations" }, scheduleRefetch)
      .subscribe();
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(ch);
    };
  }, [supabase, fetchStats, scheduleRefetch]);

  // ---------- UI ----------
  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-800">กรุณาเข้าสู่ระบบก่อน</h1>
          <p className="text-sm text-amber-800/80 mt-1">ต้องเข้าสู่ระบบเพื่อดูข้อมูลสถิติของร้าน</p>
          <div className="mt-4 flex gap-3">
            <Link href="/auth/login" className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700">
              เข้าสู่ระบบ
            </Link>
            <Link href="/auth/register" className="rounded-xl border border-indigo-300 px-4 py-2 hover:bg-indigo-50">
              สมัครสมาชิก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 bg-gray-50 flex items-center justify-center">
      <main className="max-w-4xl w-full px-6 py-10 bg-white shadow-xl rounded-2xl">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {stats.map((stat, idx) => (
            <div key={idx} className={`rounded-2xl shadow-lg p-8 flex flex-col items-center ${stat.color}`}>
              <div className={`text-4xl font-bold mb-2 ${stat.text}`}>{stat.value}</div>
              <div className="text-lg font-medium text-gray-700">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

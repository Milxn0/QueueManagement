/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

type Stat = {
  label: string;
  value: number;
  color: string;
  text: string;
};

export default function DashboardPage() {
  const supabase = createClient();

  // auth
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // stats
  const [stats, setStats] = useState<Stat[]>([
    { label: "จำนวนคิววันนี้", value: 0, color: "bg-blue-100", text: "text-blue-700" },
    { label: "จำนวนคิวเดือนนี้", value: 0, color: "bg-green-100", text: "text-green-700" },
    { label: "จำนวนคิวที่ไม่มา", value: 0, color: "bg-yellow-100", text: "text-yellow-700" },
  ]);

  // โหลดสถานะผู้ใช้เหมือนหน้า Reservation
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsLoggedIn(!!data.user);
      setLoading(false);
    };

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // ดึงสถิติจากตาราง reservations
  const fetchStats = async () => {
    // ดึงเฉพาะคอลัมน์ที่ต้องใช้ให้เบาลง
    const { data, error } = await supabase
      .from("reservations") 
      .select("reservation_datetime,status");

    if (error || !data) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    // const todayStr = `${dd}`;
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const monthStr = `${yyyy}-${mm}`;
    const yearStr = `${yyyy}`;

    const todayCount = data.filter((r: any) => r.reservation_datetime?.slice(0, 10) === todayStr).length;
    const monthCount = data.filter((r: any) => r.reservation_datetime?.slice(0, 7) === monthStr).length;
    const noShowCount = data.filter((r: any) => r.status === "no_show").length; // <-- ปรับสถานะตามจริง

    setStats([
      { label: "คิววันนี้", value: todayCount, color: "bg-blue-100", text: "text-blue-700" },
      { label: "จำนวนคิวเดือนนี้", value: monthCount, color: "bg-green-100", text: "text-green-700" },
      { label: "จำนวนคิวที่ไม่มา", value: noShowCount, color: "bg-yellow-100", text: "text-yellow-700" },
    ]);
  };

  // initial + realtime subscribe
  useEffect(() => {
    fetchStats();

    // สมัคร realtime จากตารางเดียวกับที่ query
    const channel = supabase
      .channel("reservations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
          <p className="text-sm text-amber-800/80 mt-1">
            ต้องเข้าสู่ระบบเพื่อดูข้อมูลสถิติของร้าน
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/auth/login"
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/auth/register"
              className="rounded-xl border border-indigo-300 px-4 py-2 hover:bg-indigo-50"
            >
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
            <div
              key={idx}
              className={`rounded-2xl shadow-lg p-8 flex flex-col items-center ${stat.color}`}
            >
              <div className={`text-4xl font-bold mb-2 ${stat.text}`}>{stat.value}</div>
              <div className="text-lg font-medium text-gray-700">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

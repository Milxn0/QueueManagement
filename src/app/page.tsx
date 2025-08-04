"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ReservationWithUser = {
  reservation_datetime: string;
  user_id: string;
};

export default function Home() {
  const [queueList, setQueueList] = useState<{ code: string; time: string }[]>([]);

  useEffect(() => {
    const fetchQueue = async () => {
      // Step 1: ดึง user_id ทั้งหมดจาก blacklist ที่ยัง active อยู่
      const { data: blacklistedUsers, error: blacklistError } = await supabase
        .from("blacklist")
        .select("user_id")
        .eq("active", true)
        .gt("until", new Date().toISOString());

      if (blacklistError) {
        console.error("❌ ดึง blacklist ไม่สำเร็จ:", blacklistError.message);
        return;
      }

      const blacklistedIds = blacklistedUsers?.map((b) => b.user_id) || [];

      // Step 2: ดึง reservations ทั้งหมด ยกเว้น user_id ที่ถูกแบน
      const { data, error } = await supabase
        .from("reservations")
        .select("reservation_datetime, user_id")
        .not("user_id", "in", `(${blacklistedIds.map(id => `'${id}'`).join(",")})`)
        .order("reservation_datetime", { ascending: true });

      if (error) {
        console.error("❌ ดึงข้อมูลไม่สำเร็จ:", error.message);
        return;
      }

      const queueWithCode = data.map((item: ReservationWithUser, index: number) => ({
        code: `A${index + 1}`,
        time: new Date(item.reservation_datetime).toLocaleString("th-TH", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      }));

      setQueueList(queueWithCode);
    };

    fetchQueue();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-indigo-600">
        รายการคิวปัจจุบัน
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {queueList.map((item, index) => (
          <div
            key={index}
            className="bg-white shadow-md rounded-2xl p-6 border border-indigo-200"
          >
            <h2 className="text-2xl font-semibold text-indigo-500 mb-2">
              คิว {item.code}
            </h2>
            <p className="text-gray-600">เวลา: {item.time}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

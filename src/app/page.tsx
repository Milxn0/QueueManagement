/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons/faLayerGroup";

type Reservation = {
  id: string;
  user_id: string | null;
  reservation_datetime: string;
  queue_code: string | null;
};

export default function HomePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [allQueues, setAllQueues] = useState<Reservation[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setErr(null);
      setLoading(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id ?? null;
        if (mounted) setUserId(uid);

        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
          .from("reservations")
          .select("id,user_id,reservation_datetime,queue_code")
          .eq("status", "waiting")
          .gte("reservation_datetime", nowIso)
          .order("reservation_datetime", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (mounted) setAllQueues(data ?? []);
      } catch (e: any) {
        if (mounted) setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: any, session: { user: { id: any } }) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const myReservation = useMemo(() => {
    if (!userId) return null;
    return allQueues.find((q) => q.user_id === userId) ?? null;
  }, [allQueues, userId]);

  const otherQueues = useMemo(() => {
    if (!myReservation) return allQueues;
    return allQueues.filter((q) => q.id !== myReservation.id);
  }, [allQueues, myReservation]);

  const myIndex = useMemo(() => {
    if (!myReservation) return null;
    const idx = allQueues.findIndex((q) => q.id === myReservation.id);
    return idx >= 0 ? idx : null;
  }, [allQueues, myReservation]);

  const fmtTime = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
        <div className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <FontAwesomeIcon icon={faLayerGroup} />
            My Queue
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            ตรวจสอบลำดับคิวปัจจุบัน
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            สามารถตรวจสอบลำดับคิวของตัวเองได้ที่นี่
          </p>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {err}
        </div>
      )}

      {/* คิวของฉัน */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium ">คิวของฉัน</h2>
        {!userId && (
          <div className="rounded-xl border px-4 py-5 bg-gray-50">
            <p className="text-sm">
              กรุณา{" "}
              <a className="text-indigo-600 underline" href="/auth/login">
                เข้าสู่ระบบ
              </a>{" "}
              เพื่อดูคิวของคุณ
            </p>
          </div>
        )}

        {userId && (
          <>
            {!myReservation ? (
              <div className="rounded-xl border px-4 py-5 bg-gray-50">
                <p className="text-sm">
                  ตอนนี้คุณยังไม่มีคิว —{" "}
                  <Link
                    className="text-indigo-600 underline"
                    href="/user/reservation"
                  >
                    จองคิว
                  </Link>{" "}
                  ได้เลย
                </p>
              </div>
            ) : (
              <div className="rounded-xl border px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white shadow-sm">
                <div>
                  <p className="text-sm text-gray-500">Queue Code</p>
                  <p className="text-2xl font-semibold text-indigo-600">
                    {myReservation.queue_code ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">วันเวลา</p>
                  <p className="font-medium">
                    {fmtTime(myReservation.reservation_datetime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ถึงคิวฉันในอีก</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {typeof myIndex === "number" ? `${myIndex} คิว` : "-"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* คิวทั้งหมด */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">คิวถัดไป</h2>

        {loading ? (
          <div className="rounded-xl border px-4 py-5 text-sm text-gray-500">
            กำลังโหลด…
          </div>
        ) : otherQueues.length === 0 ? (
          <div className="rounded-xl border px-4 py-5 text-sm text-gray-500">
            ยังไม่มีคิวถัดไป
          </div>
        ) : (
          <ul className="divide-y rounded-xl border overflow-hidden">
            {otherQueues.map((q) => (
              <li
                key={q.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <span className="font-semibold text-indigo-600">
                  {q.queue_code ?? "-"}
                </span>
                <span className="text-sm text-gray-600">
                  {fmtTime(q.reservation_datetime)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

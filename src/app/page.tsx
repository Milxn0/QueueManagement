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
  status: string | null;
  created_at: string | null;
};

export default function HomePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // คิวของฉัน
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  // คิวถัดไป (เฉพาะ confirmed)
  const [confirmedQueues, setConfirmedQueues] = useState<Reservation[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setErr(null);
      setLoading(true);
      try {
        // 1) ผู้ใช้ปัจจุบัน
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id ?? null;
        if (mounted) setUserId(uid);

        const nowIso = new Date().toISOString();

        // 2) คิวของฉัน (ทั้งหมดที่ยังไม่ถึงเวลา)
        if (uid) {
          const { data: mine, error: mineErr } = await supabase
            .from("reservations")
            .select(
              "id,user_id,reservation_datetime,queue_code,status,created_at"
            )
            .eq("user_id", uid)
            .gte("reservation_datetime", nowIso)
            .order("reservation_datetime", { ascending: true })
            .order("created_at", { ascending: true });

          if (mineErr) throw mineErr;
          if (mounted) setMyReservations(mine ?? []);
        } else {
          if (mounted) setMyReservations([]);
        }

        // 3) คิวถัดไป (เฉพาะ confirmed)
        const { data: conf, error: confErr } = await supabase
          .from("reservations")
          .select(
            "id,user_id,reservation_datetime,queue_code,status,created_at"
          )
          .eq("status", "confirmed")
          .gte("reservation_datetime", nowIso)
          .order("reservation_datetime", { ascending: true })
          .order("created_at", { ascending: true });

        if (confErr) throw confErr;
        if (mounted) setConfirmedQueues(conf ?? []);
      } catch (e: any) {
        if (mounted) setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const { data: auth } = supabase.auth.onAuthStateChange((_e: any, s: { user: { id: any; }; }) => {
      setUserId(s?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      auth?.subscription?.unsubscribe();
    };
  }, [supabase]);

  // หาตำแหน่งฉันในลิสต์ confirmed
  const getMyIndex = (r: Reservation) => {
    if ((r.status ?? "").toLowerCase() !== "confirmed") return null;
    const idx = confirmedQueues.findIndex((q) => q.id === r.id);
    return idx >= 0 ? idx : null;
  };

  // คิวถัดไป
  const otherQueues = useMemo(() => {
    if (myReservations.length === 0) return confirmedQueues;
    const mineIds = new Set(myReservations.map((m) => m.id));
    return confirmedQueues.filter((q) => !mineIds.has(q.id));
  }, [confirmedQueues, myReservations]);

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
        <h2 className="text-lg font-medium">คิวของฉัน</h2>

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
            {myReservations.length === 0 ? (
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
              <ul className="space-y-3">
                {myReservations.map((r) => {
                  const idx = getMyIndex(r);
                  return (
                    <li
                      key={r.id}
                      className="rounded-xl border px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white shadow-sm"
                    >
                      <div>
                        <p className="text-sm text-gray-500">Queue Code</p>
                        <p className="text-2xl font-semibold text-indigo-600">
                          {r.queue_code ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">วันเวลา</p>
                        <p className="font-medium">
                          {fmtTime(r.reservation_datetime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ถึงคิวฉันในอีก</p>
                        <p className="text-lg font-semibold text-emerald-600">
                          {(r.status ?? "").toLowerCase() === "waiting"
                            ? "รอพนักงานคอนเฟิร์ม"
                            : typeof idx === "number"
                            ? `${idx} คิว`
                            : "-"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>

      {/* คิวถัดไป (เฉพาะที่ยืนยันแล้ว) */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">คิวถัดไป</h2>

        {loading ? (
          <div className="rounded-xl border px-4 py-5 text-sm text-gray-500">
            กำลังโหลด…
          </div>
        ) : otherQueues.length === 0 ? (
          <div className="rounded-xl border px-4 py-5 text-sm text-gray-500">
            ยังไม่มีคิวถัดไป (ที่ยืนยันแล้ว)
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

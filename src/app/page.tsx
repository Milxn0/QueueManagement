/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
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

  // --- paging (confirmedQueues) ---
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(confirmedQueues.length / PAGE_SIZE));

  const pagedQueues = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return confirmedQueues.slice(start, start + PAGE_SIZE);
  }, [confirmedQueues, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setErr(null);
      setLoading(true);
      try {
        // เวลาอ้างอิง
        const now = new Date();

        // ผ่อนผัน 10 นาที
        const grace = new Date(now.getTime() - 10 * 60 * 1000);
        const graceIso = grace.toISOString();

        // 1) ผู้ใช้ปัจจุบัน
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id ?? null;
        if (mounted) setUserId(uid);

        // 2) คิวของฉัน (หน่วง 10 นาที)
        if (uid) {
          const { data: mine, error: mineErr } = await supabase
            .from("reservations")
            .select(
              "id,user_id,reservation_datetime,queue_code,status,created_at"
            )
            .eq("user_id", uid)
            .in("status", ["waiting", "confirmed"])
            .gte("reservation_datetime", graceIso)
            .order("reservation_datetime", { ascending: true })
            .order("created_at", { ascending: true });

          if (mineErr) throw mineErr;

          // กรองซ้ำฝั่ง client
          const safeMine = (mine ?? []).filter(
            (r: { reservation_datetime: string | number | Date }) =>
              new Date(r.reservation_datetime).getTime() >= grace.getTime()
          );
          if (mounted) setMyReservations(safeMine);
        } else {
          if (mounted) setMyReservations([]);
        }

        // 3) คิวถัดไป (เฉพาะ confirmed) — หน่วง 10 นาที
        const { data: conf, error: confErr } = await supabase
          .from("reservations")
          .select(
            "id,user_id,reservation_datetime,queue_code,status,created_at"
          )
          .eq("status", "confirmed")
          .gte("reservation_datetime", graceIso)
          .order("reservation_datetime", { ascending: true })
          .order("created_at", { ascending: true });

        if (confErr) throw confErr;

        const safeConf = (conf ?? []).filter(
          (r: { reservation_datetime: string | number | Date }) =>
            new Date(r.reservation_datetime).getTime() >= grace.getTime()
        );
        if (mounted) setConfirmedQueues(safeConf);
      } catch (e: any) {
        if (mounted) setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const { data: auth } = supabase.auth.onAuthStateChange(
      (_e: any, s: any) => {
        setUserId(s?.user?.id ?? null);
      }
    );

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
                  const isFirst = typeof idx === "number" && idx === 0;
                  const status = (r.status ?? "").toLowerCase();

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
                        {status === "waiting" ? (
                          <p className="text-lg font-semibold text-amber-600">
                            รอพนักงานคอนเฟิร์ม
                          </p>
                        ) : status === "confirmed" ? (
                          (() => {
                            const msUntil =
                              new Date(r.reservation_datetime).getTime() -
                              Date.now();
                            const within10m =
                              isFirst && msUntil <= 10 * 60 * 1000;

                            if (within10m) {
                              return (
                                <div>
                                  <p className="text-lg font-semibold text-emerald-600">
                                    คิวปัจจุบันคือคิวของคุณ
                                  </p>
                                  <p className="text-xs text-amber-600 mt-1">
                                    กรุณารายงานตัวกับพนักงานภายใน 10 นาที
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div>
                                <p className="text-lg font-semibold text-indigo-600">
                                  พนักงานได้ยืนยันคิวแล้ว
                                </p>
                                <p className="text-xs text-amber-600 mt-1">
                                  กรุณารอจนกว่าจะถึงเวลาที่ได้ทำการจองไว้
                                </p>
                              </div>
                            );
                          })()
                        ) : (
                          <>
                            <p className="text-sm text-gray-500">
                              ถึงคิวในอีก
                            </p>
                            <p className="text-lg font-semibold text-emerald-600">
                              -
                            </p>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>

      {/* คิวทั้งหมด (เฉพาะที่ยืนยันแล้ว) */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">คิวทั้งหมด</h2>

        {loading ? (
          <div className="rounded-xl border px-4 py-5 text-sm text-gray-500">
            กำลังโหลด…
          </div>
        ) : confirmedQueues.length === 0 ? (
          <div className="rounded-xl border px-4 py-5 text-sm text-gray-500">
            ยังไม่มีคิวในระบบ
          </div>
        ) : (
          <>
            <ul className="divide-y rounded-xl border overflow-hidden">
              {pagedQueues.map((q, i) => {
                const isMine = q.user_id === userId;
                const globalIndex = (page - 1) * PAGE_SIZE + i + 1; // ลำดับคิวรวมทุกหน้า
                return (
                  <li
                    key={q.id}
                    className={[
                      "px-4 py-3 flex items-center justify-between transition",
                      isMine ? "bg-indigo-50/70" : "hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      {/* ลำดับคิว 1-based (รวมทุกหน้า) */}
                      <span
                        className={[
                          "inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold",
                          isMine
                            ? "border-indigo-400 text-indigo-700"
                            : "border-gray-300 text-gray-600",
                        ].join(" ")}
                        title="ลำดับคิว"
                      >
                        {globalIndex}
                      </span>

                      {/* รหัสคิว */}
                      <span
                        className={
                          isMine
                            ? "font-semibold text-indigo-700"
                            : "font-semibold text-indigo-600"
                        }
                      >
                        {q.queue_code ?? "-"}
                      </span>

                      {isMine && (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          คิวของคุณ
                        </span>
                      )}
                    </div>

                    <span className="text-sm text-gray-600">
                      {fmtTime(q.reservation_datetime)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Pager */}
            {confirmedQueues.length > PAGE_SIZE && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  หน้า{" "}
                  <span className="font-medium text-gray-900">{page}</span> /{" "}
                  {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-xl border px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    หน้าก่อนหน้า
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page >= totalPages}
                    className="rounded-xl border px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    หน้าถัดไป
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

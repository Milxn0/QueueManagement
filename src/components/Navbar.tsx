/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // ดึงผู้ใช้ปัจจุบัน
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    };
    load();

    // subscribe เปลี่ยนสถานะ auth (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    // ถ้าต้องการให้ refresh navbar
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <nav className="text-indigo-500 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
      <div className="flex justify-between items-center w-full sm:w-auto">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
          <span className="font-bold text-lg hidden sm:inline">Seoul BBQ</span>
        </Link>

        <button
          className="sm:hidden text-indigo-600 border border-indigo-300 px-3 py-1 rounded-lg"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle Menu"
        >
          เมนู
        </button>
      </div>

      <ul
        className={`grid gap-3 sm:flex sm:items-center ${menuOpen ? "mt-3" : "hidden sm:flex"}`}
      >
        <li>
          <Link href="/user/reservation" className="hover:text-indigo-300 block">
            จองคิว
          </Link>
        </li>
        <li>
          <Link href="/user/contact" className="hover:text-indigo-300 block">
            ติดต่อเรา
          </Link>
        </li>

        {/* ด้านขวา: แสดงสถานะผู้ใช้ */}
        <li className="sm:ml-6">
          {email ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">เข้าสู่ระบบเป็น: <b>{email}</b></span>
              <button
                onClick={onSignOut}
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg border border-indigo-300 px-3 py-1.5 text-sm hover:bg-indigo-50"
              >
                สมัครสมาชิก
              </Link>
            </div>
          )}
        </li>
      </ul>
    </nav>
  );
}

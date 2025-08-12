/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import UserMenu from "@/components/UserMenu";
import { createPortal } from "react-dom"; // ⬅️ เพิ่ม
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false); // ⬅️ เพิ่ม
  const supabase = createClient();

  useEffect(() => setMounted(true), []); // ⬅️ เพิ่ม

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    };
    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 640) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="w-10 h-10 rounded-full ring-1 ring-gray-200"
          />
          <span className="font-bold text-lg text-indigo-600 hidden sm:inline">
            Seoul BBQ
          </span>
        </Link>

        {/* Desktop menu */}
        <div className="hidden sm:flex sm:items-center sm:gap-6 text-indigo-500 font-bold">
          <Link href="/" className="hover:text-indigo-300">
            หน้าแรก
          </Link>
          <Link href="/user/reservation" className="hover:text-indigo-300">
            จองคิว
          </Link>
          <Link href="/user/contact" className="hover:text-indigo-300">
            ติดต่อเรา
          </Link>

          <div className="sm:ml-2">
            {email ? (
              <div className="flex items-center gap-3">
                <UserMenu />
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
          </div>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 sm:hidden">
          {email && !menuOpen && <UserMenu />}
          <button
            onClick={toggleMenu}
            aria-label="เปิดเมนู"
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-indigo-200 text-indigo-600 active:scale-95"
          >
            {!menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M6 18L18 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* === Mobile Backdrop + Drawer via Portal === */}
      {mounted &&
        menuOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="sm:hidden fixed inset-0 bg-black/70 z-[100] transition-opacity duration-200 opacity-100"
              onClick={closeMenu}
            />

            {/* Drawer */}
            <aside
              id="mobile-drawer"
              className="sm:hidden fixed inset-y-0 left-0 w-[80%] max-w-xs bg-white border-r shadow-xl
                 transition-transform duration-200 translate-x-0 z-[110]"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              {/* ... (เดิม) ... */}

              {/* Body */}
              <div className="px-2 py-3 bg-gray-50">
                <nav className="space-y-1">
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className={`block px-3 py-3 rounded-lg text-[15px] ${
                      pathname === "/"
                        ? "font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100"
                        : "font-medium hover:bg-gray-50"
                    }`}
                  >
                    หน้าแรก
                  </Link>
                  <Link
                    href="/user/reservation"
                    onClick={closeMenu}
                    className={`block px-3 py-3 rounded-lg text-[15px] ${
                      pathname.startsWith("/user/reservation")
                        ? "font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100"
                        : "font-medium hover:bg-gray-50"
                    }`}
                  >
                    จองคิว
                  </Link>
                  <Link
                    href="/user/contact"
                    onClick={closeMenu}
                    className={`block px-3 py-3 rounded-lg text-[15px] ${
                      pathname.startsWith("/user/contact")
                        ? "font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100"
                        : "font-medium hover:bg-gray-50"
                    }`}
                  >
                    ติดต่อเรา
                  </Link>
                </nav>

                <div className="my-4 h-px bg-gray-100" />

                {email ? (
                  <div className="space-y-2">
                    <p className="px-3 text-xs text-gray-500">บัญชีของฉัน</p>
                    <Link
                      href="/reservations/history"
                      onClick={closeMenu}
                      className="block px-3 py-3 rounded-lg text-[15px] hover:bg-gray-50"
                    >
                      ประวัติการจอง
                    </Link>
                    <Link
                      href="/profile"
                      onClick={closeMenu}
                      className="block px-3 py-3 rounded-lg text-[15px] hover:bg-gray-50"
                    >
                      ข้อมูลส่วนตัว
                    </Link>

                    {/* ปุ่มออกจากระบบใน Drawer มือถือ */}
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        closeMenu();
                        window.location.href = "/auth/login";
                      }}
                      className="mt-2 block w-full text-left px-3 py-3 rounded-lg text-[15px] text-red-600 hover:bg-red-50"
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2 px-2">
                    <Link
                      href="/auth/login"
                      onClick={closeMenu}
                      className="text-center rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-medium active:scale-[.98]"
                    >
                      เข้าสู่ระบบ
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={closeMenu}
                      className="text-center rounded-lg border border-indigo-200 py-2.5 text-sm font-medium hover:bg-indigo-50 active:scale-[.98]"
                    >
                      สมัครสมาชิก
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          </>,
          document.body
        )}
    </nav>
  );
}

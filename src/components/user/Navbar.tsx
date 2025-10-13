/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client";
import AppSettingText from "../common/AppSettingText";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import UserMenu from "@/components/user/UserMenu";
import { createClient } from "@/lib/supabaseClient";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [storeName, setStoreName] = useState<string>("");
  const [storeImageUrl, setStoreImageUrl] = useState<string>("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("app_settings")
          .select("store_name, store_image_url")
          .eq("id", 1)
          .maybeSingle();

        if (!alive) return;
        if (!error && data) {
          setStoreName(String(data.store_name ?? ""));
          setStoreImageUrl(String(data.store_image_url ?? ""));
        }
      } catch {
        /* เงียบไว้ */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const email = user?.email ?? null;

  const NavLink = ({
    href,
    label,
    active,
    onClick,
  }: {
    href: string;
    label: string;
    active: boolean;
    onClick?: () => void;
  }) => (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-[15px] ${
        active
          ? "font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100"
          : "font-medium hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-10 xl:px-12 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <img
              src={
                storeImageUrl && storeImageUrl.trim()
                  ? storeImageUrl
                  : "/logo.jpg"
              }
              alt="logo"
              className="h-7 w-7 rounded object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.jpg";
              }}
            />
            <span className="font-semibold" >{storeName}</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/" label="หน้าแรก" active={pathname === "/"} />
            <NavLink
              href="/user/reservation"
              label="จองคิว"
              active={pathname.startsWith("/user/reservation")}
            />
            <NavLink
              href="/user/contact"
              label="ติดต่อเรา"
              active={pathname.startsWith("/user/contact")}
            />

            <NavLink
              href="/user/menu-users"
              label="เมนู"
              active={pathname.startsWith("/user/menu-users")}
            />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {email ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[.98]"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 active:scale-[.98]"
              >
                สมัครสมาชิก
              </Link>
            </div>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-2">
          {email ? (
            <UserMenu />
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 active:scale-[.98]"
            >
              เข้าสู่ระบบ
            </Link>
          )}
          <button
            aria-label="เปิดเมนู"
            className="rounded-lg border px-3 py-2 active:scale-[.98]"
            onClick={() => setMenuOpen(true)}
          >
            เมนู
          </button>
        </div>
      </div>

      {/* Drawer*/}
      {mounted &&
        menuOpen &&
        createPortal(
          <aside className="fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.jpg" alt="logo" className="h-7 w-7" />
                  <span className="font-semibold">Seoul BBQ</span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border p-1"
                  aria-label="ปิดเมนู"
                >
                  ✕
                </button>
              </div>
              <div className="h-px bg-gray-100" />
              <NavLink
                href="/"
                label="หน้าแรก"
                active={pathname === "/"}
                onClick={() => setMenuOpen(false)}
              />
              <NavLink
                href="/user/reservation"
                label="จองคิว"
                active={pathname.startsWith("/user/reservation")}
                onClick={() => setMenuOpen(false)}
              />
              <NavLink
                href="/user/contact"
                label="ติดต่อเรา"
                active={pathname.startsWith("/user/contact")}
                onClick={() => setMenuOpen(false)}
              />
              {!email && (
                <Link
                  href="/auth/register"
                  className="mt-2 text-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  สมัครสมาชิก
                </Link>
              )}
            </div>
          </aside>,
          document.body
        )}
    </nav>
  );
}

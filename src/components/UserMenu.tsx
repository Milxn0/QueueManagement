"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { createPortal } from "react-dom";

type Profile = {
  id: string;
  role: string | null;
  name: string | null;
  email: string | null;
};

export default function UserMenu() {
  const supabase = createClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // ตำแหน่ง dropdown
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // โหลด session + โปรไฟล์
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;

      if (!uid) {
        if (alive) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, role, name, email")
        .eq("id", uid)
        .single();

      if (!alive) return;

      if (error) {
        setProfile({
          id: uid,
          role: null,
          name: null,
          email: userRes.user?.email ?? null,
        });
      } else {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // คำนวณตำแหน่ง dropdown
  const computePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 4;

    const right = Math.max(window.innerWidth - rect.right - gap, 8);
    setPos({
      top: rect.bottom + window.scrollY + gap,
      right,
    });
  };

  // อัปเดตตำแหน่ง
  useEffect(() => {
    if (!open) return;
    computePosition();
    const onScroll = () => computePosition();
    const onResize = () => computePosition();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.refresh();
    router.push("/auth/login");
  };

  if (!profile && !loading) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600"
      >
        เข้าสู่ระบบ
      </Link>
    );
  }

  const HeaderBlock = () => (
    <div className="px-4 py-3 bg-gray-50">
      {profile?.role === "admin" ? (
        <>
          <p className="text-xs text-gray-500">ผู้ดูแลระบบ</p>
          <p className="font-semibold truncate">{profile?.name || "Admin"}</p>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500">ลงชื่อเข้าใช้ด้วย</p>
          <p className="font-semibold truncate">{profile?.email || "-"}</p>
        </>
      )}
    </div>
  );

  const MenuItems = () => (
    <div className="py-1">
      {profile?.role !== "admin" && (
        <>
          <Link href="/reservations/history" className="block px-4 py-2 text-sm hover:bg-gray-50">
            ประวัติการจอง
          </Link>
          <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50">
            ข้อมูลส่วนตัว
          </Link>
        </>
      )}
      {profile?.role === "admin" && (
        <>
          <Link href="/admin/dashboard" className="block px-4 py-2 text-sm hover:bg-gray-50">
            Dashboard
          </Link>
          <Link href="/admin/manage-users" className="block px-4 py-2 text-sm hover:bg-gray-50">
            จัดการผู้ใช้
          </Link>
          <Link href="/admin/manage-queue" className="block px-4 py-2 text-sm hover:bg-gray-50">
            จัดการคิว
          </Link>
        </>
      )}
      <div className="my-1 h-px bg-gray-100" />
      <button
        onClick={signOut}
        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        ออกจากระบบ
      </button>
    </div>
  );

  return (
    <>
      {/* Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="เมนูผู้ใช้"
      >
        <Image
          src="/profile.png"
          alt="User avatar"
          width={40}
          height={40}
          className="rounded-full ring-1 ring-gray-200 hover:ring-indigo-300"
        />
      </button>

      {/* Desktop dropdown */}
      {mounted && open && createPortal(
        <div className="hidden sm:block">
          {/* backdrop*/}
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[95] w-64 rounded-xl border bg-white shadow-lg overflow-hidden"
            style={{ top: pos.top, right: pos.right }}
          >
            <HeaderBlock />
            <MenuItems />
          </div>
        </div>,
        document.body
      )}

      {/* Mobile bottom*/}
      {mounted && open && createPortal(
        <div className="sm:hidden">
          <div className="fixed inset-0 bg-black/30 z-[80]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            className="fixed inset-x-0 bottom-0 z-[90] rounded-t-2xl border-t bg-white shadow-2xl pb-[max(env(safe-area-inset-bottom),12px)]"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-3">
                <Image
                  src="/profile.png"
                  alt="User avatar"
                  width={36}
                  height={36}
                  className="rounded-full ring-1 ring-gray-200"
                />
                <div className="min-w-0">
                  {profile?.role === "admin" ? (
                    <>
                      <p className="text-xs text-gray-500">ผู้ดูแลระบบ</p>
                      <p className="font-semibold truncate">{profile?.name || "Admin"}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500">ลงชื่อเข้าใช้ด้วย</p>
                      <p className="font-semibold truncate">{profile?.email || "-"}</p>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="ปิดเมนู"
              >
                <span className="block h-5 w-5">✕</span>
              </button>
            </div>
            <div className="h-px bg-gray-100" />
            <MenuItems />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

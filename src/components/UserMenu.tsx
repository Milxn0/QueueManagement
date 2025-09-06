"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // กด Esc เพื่อปิด
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!user) return null;

  return (
    <>
      {/* ปุ่ม Avatar */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border p-1 hover:bg-gray-50"
        aria-label="เปิดเมนูผู้ใช้"
      >
        <Image
          src="/profile.png"
          alt="avatar"
          width={32}
          height={32}
          className="rounded-full"
        />
      </button>

      {/* เมนูแบบ Overlay + แผงด้านขวาบน */}
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            {/* ฉากหลังมืด */}
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setOpen(false)}
            />

            {/* แผงเมนู */}
            <div
              ref={panelRef}
              className="absolute right-4 top-14 w-[320px] rounded-2xl bg-white border shadow-xl p-3"
            >
              {/* ส่วนหัวแบบรูป — ชื่อ/อีเมลเด่น */}
              <div className="rounded-xl border bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white grid place-items-center shadow-sm">
                    <Image
                      src="/profile.png"
                      alt="avatar"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-5 truncate">
                      {profile?.name ?? user.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="my-2 h-px bg-gray-100" />

              {/* รายการเมนู */}

              <div className="flex flex-col gap-1">
                {/* --- กลุ่ม Admin / Manager / Staff --- */}
                {(profile?.role === "admin" ||
                  profile?.role === "manager" ||
                  profile?.role === "staff") && (
                  <>
                    {/* จัดการคิว (admin, manager, staff) */}
                    <Link
                      href="/admin/dashboard"
                      className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      จัดการคิว
                    </Link>

                    {/* ประวัติการจองคิวทั้งหมด (admin, manager, staff) */}
                    <Link
                      href="/admin/manage-queue"
                      className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      ประวัติการจองคิวทั้งหมด
                    </Link>

                    {/* สถิติการจอง (admin, manager) */}
                    {(profile?.role === "admin" ||
                      profile?.role === "manager") && (
                      <Link
                        href="/admin/analytics"
                        className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                        onClick={() => setOpen(false)}
                      >
                        สถิติการจอง
                      </Link>
                    )}

                    {/* จัดผู้ใช้ (admin) */}
                    {profile?.role === "admin" && (
                      <>
                      <Link
                        href="/admin/manage-users"
                        className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                        onClick={() => setOpen(false)}
                      >
                        จัดผู้ใช้
                      </Link>
                      <Link
                        href="/admin/settings"
                        className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                        onClick={() => setOpen(false)}
                      >
                        ตั้งค่าระบบ
                      </Link>
                      </>
                    )}
                  </>
                )}

                {/* --- กลุ่ม Customer  --- */}
                {profile?.role === "customer" && (
                  <>
                    <Link
                      href="/user/profile"
                      className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      โปรไฟล์
                    </Link>
                    <Link
                      href="/user/queue-history"
                      className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      ประวัติการจองคิว
                    </Link>
                  </>
                )}

                {/* ออกจากระบบ */}
                <button
                  className="px-3 py-2 rounded-lg hover:bg-gray-50 text-left text-sm text-red-500"
                  onClick={async () => {
                    await signOut();
                    setOpen(false);
                    router.replace("/");
                  }}
                >
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

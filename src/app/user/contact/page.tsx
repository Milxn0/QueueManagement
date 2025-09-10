"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import AppSettingText from "@/components/common/AppSettingText";
import { useSettings } from "@/hooks/useSettings";

function extractHandle(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/|\/$/g, "");
    const [name] = path.split("/");
    return name || "-";
  } catch {
    return "-";
  }
}

export default function ContactPage() {
  const { settings, loading } = useSettings();

  const instagramUrl = settings?.contact_ig ?? "";
  const facebookUrl = settings?.contact_facebook ?? "";

  const igHandle = useMemo(
    () => extractHandle(instagramUrl),
    [instagramUrl]
  );
  const fbHandle = useMemo(
    () => (facebookUrl ? extractHandle(facebookUrl) : "-"),
    [facebookUrl]
  );

  const Card = ({
    href,
    children,
    ariaLabel,
    className,
  }: {
    href?: string;
    children: React.ReactNode;
    ariaLabel: string;
    className?: string;
  }) => {
    const content = (
      <div
        className={[
          "group flex items-center gap-4 rounded-2xl",
          "border border-transparent bg-white/70 px-4 py-4 shadow-sm",
          "ring-1 ring-gray-100 hover:ring-indigo-200",
          "transition-all duration-200 ease-out",
          "hover:shadow-md hover:-translate-y-[1px]",
          className ?? "",
        ].join(" ")}
      >
        {children}
      </div>
    );

    return href ? (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        prefetch={false}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-2xl"
      >
        {content}
      </Link>
    ) : (
      <div
        aria-label={ariaLabel}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-2xl"
      >
        {content}
      </div>
    );
  };

  const Pill = ({ text }: { text: string }) => (
    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
      {text}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/40 px-4 py-10 flex items-center justify-center">
      <main className="w-full max-w-xl rounded-3xl border border-indigo-100 bg-white/80 shadow-xl backdrop-blur-sm px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Pill text="Contact" />
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ช่องทางการติดต่อ
            </span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            ติดต่อเราได้ทาง Facebook, Instagram หรือโทรศัพท์
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-4 text-base sm:text-lg font-medium text-gray-800">
          {/* Facebook */}
          <Card href={facebookUrl || undefined} ariaLabel="ไปที่ Facebook Page">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1877F2]/10 ring-1 ring-[#1877F2]/20">
              <Image
                src="/Facebook-logo.png"
                alt="Facebook Logo"
                width={24}
                height={24}
                className="transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex-1">
              <div className="text-gray-900">
                {loading ? "…" : fbHandle !== "-" ? fbHandle : "Facebook Page"}
              </div>
              <div className="text-xs text-gray-500">@koreanbbqhatyai</div>
            </div>
            <span className="ml-auto text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
              เปิดลิงก์ →
            </span>
          </Card>

          {/* Instagram */}
          <Card href={instagramUrl || undefined} ariaLabel="ไปที่ Instagram">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500/10 ring-1 ring-pink-500/20">
              <Image
                src="/Instagram_logo_2022.svg.png"
                alt="Instagram Logo"
                width={24}
                height={24}
                className="transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex-1">
              <div className="text-gray-900">@{loading ? "…" : igHandle}</div>
              <div className="text-xs text-gray-500">Instagram</div>
            </div>
            <span className="ml-auto text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
              เปิดลิงก์ →
            </span>
          </Card>

          {/* Tel */}
          <a
            href="tel:074239246"
            aria-label="โทรศัพท์ 074-239-246"
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-2xl"
          >
            <div className="group flex items-center gap-4 rounded-2xl border border-transparent bg-white/70 px-4 py-4 shadow-sm ring-1 ring-gray-100 hover:ring-emerald-200 transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <Image
                  src="/tel.png"
                  alt="Phone"
                  width={24}
                  height={24}
                  className="transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex-1">
                <div className="text-gray-900">
                  <AppSettingText keyName="contact_phone" />
                </div>
                <div className="text-xs text-gray-500">โทรศัพท์</div>
              </div>
              <span className="ml-auto text-sm text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                โทรเลย →
              </span>
            </div>
          </a>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-500">
          จันทร์ - ศุกร์ 13:00–21:00 น. <br />
          เสาร์ - อาทิตย์ 12:00–21:00 น. <br />
          (เวลาอาจมีการเปลี่ยนแปลง)
        </p>
      </main>
    </div>
  );
}

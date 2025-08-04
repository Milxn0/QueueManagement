"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function ContactPage() {
  return (
    <div className="min-h-screen px-4 py-10 bg-gray-50 flex items-center justify-center">
      <main className="max-w-md w-full px-6 py-10 bg-white shadow-xl rounded-2xl">
        <h1 className="text-3xl sm:text-4xl text-indigo-600 font-extrabold text-center mb-8">
          ช่องทางการติดต่อ
        </h1>
        <div className="space-y-5 text-base sm:text-xl font-medium text-gray-800">
          <Link
            href="https://www.facebook.com/koreanbbqhatyai"
            target="_blank"
            className="block"
          >
            <div className="bg-indigo-100 p-4 rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4">
              <Image
                src="/Facebook-logo.png"
                alt="Facebook Logo"
                width={40}
                height={40}
              />
              <span className="text-gray-800">Seoul Korean BBQ Restaurant</span>
            </div>
          </Link>

          <Link
            href="https://www.instagram.com/seoulkoreanbbq_hatyai?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
            target="_blank"
            className="block"
          >
            <div className="bg-pink-100 p-4 rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4">
              <Image
                src="/Instagram_logo_2022.svg.png"
                alt="Instagram Logo"
                width={40}
                height={40}
              />
              <span className="text-gray-800">@seoulkoreanbbq_hatyai</span>
            </div>
          </Link>

          <div className="bg-green-100 p-4 rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <Image src="/tel.png" alt="Phone" width={40} height={40} />
            <span className="text-gray-800">074-239-246</span>
          </div>
        </div>
      </main>
    </div>
  );
}

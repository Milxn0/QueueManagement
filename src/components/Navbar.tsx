/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="text-indigo-500 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
      <div className="flex justify-between items-center w-full sm:w-auto">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
          <span className="font-bold text-lg hidden sm:inline">Seoul BBQ</span>
        </Link>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden focus:outline-none"
        >
          <svg
            className="w-6 h-6 text-indigo-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <ul
        className={`${
          menuOpen ? "flex" : "hidden sm:flex"
        } flex-col sm:flex-row font-bold space-y-2 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-0 sm:items-center sm:self-auto items-end self-end text-right`}
      >
        <li>
          <Link href="/" className="hover:text-indigo-300 block">
            หน้าแรก
          </Link>
        </li>
        <li>
          <Link href="/menu" className="hover:text-indigo-300 block">
            เมนู
          </Link>
        </li>
        <li>
          <Link href="/reservation" className="hover:text-indigo-300 block">
            จองคิว
          </Link>
        </li>
        <li>
          <Link href="/contact" className="hover:text-indigo-300 block">
            ติดต่อเรา
          </Link>
        </li>
      </ul>
    </nav>
  );
}

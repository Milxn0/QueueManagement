/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// กำหนด path ที่ middleware ต้องรัน
export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};

type Role = "admin" | "manager" | "staff" | "customer" | string | null;

function canAccess(pathname: string, role: Role) {
  // admin เข้าทุกหน้า
  if (role === "admin") return true;

  // manager: analytics, dashboard, manage-queue (+ ส่วนของ user)
  if (role === "manager") {
    return (
      /^\/admin\/(analytics|dashboard|manage-queue)(\/|$)/.test(pathname) ||
      pathname.startsWith("/user")
    );
  }

  // staff: dashboard, manage-queue (+ ส่วนของ user)
  if (role === "staff") {
    return (
      /^\/admin\/(dashboard|manage-queue)(\/|$)/.test(pathname) ||
      pathname.startsWith("/user")
    );
  }

  // customer: เข้าเฉพาะ /user/*
  if (role === "customer") {
    return pathname.startsWith("/user");
  }

  // ไม่รู้ role = ไม่ให้เข้า /admin หรือ /user
  return false;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  // อ่าน user จาก session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = req.nextUrl;
  const nextUrl = pathname + (search || "");

  // ถ้าไม่ login เลย → ส่งไปหน้า login
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", nextUrl);
    const redirect = NextResponse.redirect(url);
    res.headers.forEach((v, k) => {
      if (k.toLowerCase() === "set-cookie") {
        redirect.headers.append(k, v);
      }
    });
    return redirect;
  }

  // ดึง role จากตาราง users
  let role: Role = null;
  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  role = (me?.role as Role) ?? null;

  // ตรวจสิทธิ์ตาม role
  if (!canAccess(pathname, role)) {
    // ไม่อนุญาต → เด้งกลับหน้าแรก
    const url = req.nextUrl.clone();
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    res.headers.forEach((v, k) => {
      if (k.toLowerCase() === "set-cookie") {
        redirect.headers.append(k, v);
      }
    });
    return redirect;
  }

  return res;
}

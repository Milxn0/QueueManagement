/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabaseClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function AuthAnalyticsHook() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!supabase?.auth?.onAuthStateChange) return;

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          await fetch("/api/auth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ event, session }),
          });
        } catch {/* เงียบไว้ */}
        try {
          const uid = session?.user?.id;
          if (uid && event === "SIGNED_IN") {
            await supabase.rpc("log_user_login", {
              p_user: uid,
              p_action: "login",
            });
          }
        } catch {/* เงียบไว้ */}

        router.refresh();
      }
    );

    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, [supabase, router]);

  return null;
}

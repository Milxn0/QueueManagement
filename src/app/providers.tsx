/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabaseClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function AuthAnalyticsHook() {
  const supabase = createClient();

  useEffect(() => {
    if (!supabase?.auth?.onAuthStateChange) return;

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_e: any, session: { user?: { id?: string } } | null) => {
        const uid = session?.user?.id;
        if (!uid) return;

        try {
          await supabase.rpc("log_user_login", {
            p_user: uid,
            p_action: "login",
          });
        } catch {
        }
      }
    );

    return () => {
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, [supabase]);

  return null;
}

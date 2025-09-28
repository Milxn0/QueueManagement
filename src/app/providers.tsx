/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { AuthProvider } from "@/hooks/useAuth";
import { useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
export function AuthAnalyticsHook() {
  const supabase = createClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_e: any, session: { user: { id: any; }; }) => {
        const uid = session?.user?.id;
        if (!uid) return;

        // บันทึกการเข้าใช้ (login)
        await supabase.rpc("log_user_login", {
          p_user: uid,
          p_action: "login",
        });
      }
    );

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  return null;
}

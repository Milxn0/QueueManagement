/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  role: string | null;
  name: string | null;
  email: string | null;
};

type AuthContextShape = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const firstLoad = useRef(true);

  // one subscription for the whole app
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, newSession: any) => {
      setSession(newSession ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  // load profile once per user
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id,role,name,email")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!error) setProfile((data as Profile) ?? null);
      else setProfile(null);
      setLoading(false);
    }
    if (firstLoad.current || session?.user?.id) {
      firstLoad.current = false;
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextShape>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

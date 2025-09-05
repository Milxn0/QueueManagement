/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type UserRole = "admin" | "user" | null;

type AuthState = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: UserRole;
};

type AuthContextValue = AuthState & {
  signIn: (args: { email: string; password: string }) => Promise<UserRole>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<AuthState>({
    loading: true,
    userId: null,
    email: null,
    role: null,
  });

  const fetchRole = async (uid: string): Promise<UserRole> => {
    const { data, error } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", uid)
      .single();
    if (error) return null;
    return (data?.role as UserRole) ?? null;
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!mounted) return;
      if (s?.user) {
        const role = await fetchRole(s.user.id);
        if (!mounted) return;
        setState({
          loading: false,
          userId: s.user.id,
          email: s.user.email ?? null,
          role,
        });
      } else {
        setState({ loading: false, userId: null, email: null, role: null });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_evt: any, sess: { user: { id: string; email: any } }) => {
        if (!mounted) return;
        if (sess?.user) {
          const role = await fetchRole(sess.user.id);
          if (!mounted) return;
          setState({
            loading: false,
            userId: sess.user.id,
            email: sess.user.email ?? null,
            role,
          });
        } else {
          setState({ loading: false, userId: null, email: null, role: null });
        }
      }
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = {
    ...state,
    signIn: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) throw error ?? new Error("Sign-in failed");
      const role = await fetchRole(data.user.id); // ดึง role ครั้งเดียว
      setState({
        loading: false,
        userId: data.user.id,
        email: data.user.email ?? null,
        role,
      });
      return role;
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setState({ loading: false, userId: null, email: null, role: null });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

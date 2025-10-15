/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import {
  createClient as createServerClientLib,
  type SupabaseClient,
} from "@supabase/supabase-js";

export type PublicSupabase = SupabaseClient<any, "public", "public", any, any>;

let _browserClient: PublicSupabase | null = null;

export function createClient(): PublicSupabase {
  if (typeof window === "undefined") {
    return new Proxy({} as any, {
      get() {
        throw new Error(
          "createClient() is client-only and not available on the server."
        );
      },
    }) as unknown as PublicSupabase;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return new Proxy({} as any, {
      get() {
        throw new Error(
          "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
            "Set them in your Vercel Project Settings → Environment Variables."
        );
      },
    }) as unknown as PublicSupabase;
  }

  if (!_browserClient) {
    _browserClient = createBrowserClient(
      url,
      anon
    ) as unknown as PublicSupabase;
  }
  return _browserClient;
}

export function createServerSupabase(cookiesApi?: {
  get: (name: string) => string | undefined;
  set?: (name: string, value: string, options: any) => void;
  remove?: (name: string, options: any) => void;
}): PublicSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookies = cookiesApi ?? {
    get: () => undefined,
    set: () => {},
    remove: () => {},
  };

  return createServerClient(url, anon, {
    cookies,
  }) as unknown as PublicSupabase;
}

export function createServiceClient(): PublicSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL on the server."
    );
  }
  return createServerClientLib(url, serviceKey, {
    auth: { persistSession: false },
  }) as unknown as PublicSupabase;
}

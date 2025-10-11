import { createBrowserClient } from "@supabase/ssr";
import {
  createClient as createServerClientLib,
  type SupabaseClient,
} from "@supabase/supabase-js";

let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient(): ReturnType<typeof createBrowserClient> {
  if (typeof window === "undefined") {
    return new Proxy({} as any, {
      get() {
        throw new Error(
          "createClient() is client-only and not available on the server."
        );
      },
    }) as any;
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
    }) as any;
  }

  if (!_browserClient) {
    _browserClient = createBrowserClient(url, anon);
  }
  return _browserClient;
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL on the server."
    );
  }

  return createServerClientLib(url, serviceKey, {
    auth: { persistSession: false },
  });
}

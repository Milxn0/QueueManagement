"use client";

import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _client = createBrowserClient(url, anon);
  }
  return _client;
}

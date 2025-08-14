import { createBrowserClient } from "@supabase/ssr";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Keep a single browser client instance to avoid multiple listeners & extra work
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!_browserClient) {
    _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
}

// same instance
export const supabase = createClient();

export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServerClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

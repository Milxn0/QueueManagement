// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async () => {
  const url = "https://queue-management-sage.vercel.app/api/cron/line-reminders";
  const resp = await fetch(url, {
    headers: { "x-cron-secret": Deno.env.get("CRON_SECRET")! },
  });
  const body = await resp.text();
  return new Response(body, { status: resp.status });
});
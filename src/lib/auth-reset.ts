"use server";
import "server-only";
import { createServiceClient } from "@/lib/supabaseService";

export async function sendResetEmail(email: string) {
  if (!email) throw new Error("Missing email");
  const supabase = createServiceClient();
  const base = "https://queue-management-sage.vercel.app";
  const redirectTo = `${base}/auth/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw error;
}

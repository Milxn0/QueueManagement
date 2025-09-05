/* eslint-disable @typescript-eslint/no-explicit-any */
// src/server/controllers/usersController.ts
"use server";
import "server-only";
import { createServiceClient } from "@/lib/supabaseService";

export async function listUsersSorted() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,phone,role,created_at");
  if (error) throw error;

  const weight = (u: any) => (u.role === "admin" ? 0 : 1);
  return (data ?? []).slice().sort((a, b) => weight(a) - weight(b));
}

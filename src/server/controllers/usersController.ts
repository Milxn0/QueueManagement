/* eslint-disable @typescript-eslint/no-explicit-any */
// src/server/controllers/usersController.ts
"use server";
import "server-only";
import { createServiceClient } from "@/lib/supabaseService";

export type AutofillProfile = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

export async function listUsersSorted() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,phone,role,created_at");
  if (error) throw error;

  const weight = (u: any) => (u.role === "admin" ? 0 : 1);
  return (data ?? []).slice().sort((a, b) => weight(a) - weight(b));
}

export async function getAutofillProfile(
  sb: any,
  userId: string
): Promise<AutofillProfile> {
  if (!userId) return { name: null, phone: null, email: null };

  const { data, error } = await sb
    .from("users")
    .select("name, phone, email")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    // อย่าโยน error ตรงๆ เพื่อไม่ให้หลุดไปหน้า 500
    console.error("[getAutofillProfile]", error);
    return { name: null, phone: null, email: null };
  }

  return {
    name: data?.name ?? null,
    phone: data?.phone ?? null,
    email: data?.email ?? null,
  };
}

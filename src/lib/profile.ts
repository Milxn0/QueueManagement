import { supabase } from "@/lib/supabaseClient";

export type ProfilePatch = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export async function ensureProfile(userId: string, patch: ProfilePatch) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .limit(1);
  if (error) throw error;

  if (!data || data.length === 0) {
    const { error: insErr } = await supabase.from("users").insert({
      id: userId,
      name: patch.name ?? null,
      phone: patch.phone ?? null,
      role: "customer",
      email: patch.email ?? null,
    });
    if (insErr) throw insErr;
  } else {
    const { error: updErr } = await supabase
      .from("users")
      .update({
        name: patch.name ?? null,
        phone: patch.phone ?? null,
        email: patch.email ?? null,
      })
      .eq("id", userId);
    if (updErr) throw updErr;
  }
  return userId;
}

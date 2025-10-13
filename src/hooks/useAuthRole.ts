"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export function useAuthRole() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data: u } = await supabase
          .from("users")
          .select("role")
          .eq("id", uid)
          .single();
        setIsAdmin((u?.role ?? "").toLowerCase() === "admin");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  return isAdmin;
}

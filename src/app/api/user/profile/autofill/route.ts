import { NextResponse } from "next/server";
import { serverSupabase } from "@/app/api/_helpers/supabaseServer";
import { getAutofillProfile } from "@/server/controllers/usersController";

export async function GET() {
  const sb = serverSupabase();
  const {
    data: { user },
    error: userErr,
  } = await (await sb).auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getAutofillProfile(sb, user.id);
  return NextResponse.json(profile);
}

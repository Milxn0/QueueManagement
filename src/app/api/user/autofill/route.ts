import { NextResponse } from "next/server";
import { serverSupabase } from "@/app/api/_helpers/supabaseServer";
import { getAutofillProfile } from "@/server/controllers/usersController";
export const runtime = "nodejs";
export async function GET() {
  try {
    const sb = await serverSupabase();

    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getAutofillProfile(sb, user.id);
    return NextResponse.json(profile, { status: 200 });
  } catch (err) {
    console.error("[/api/user/autofill] failed:", err);
    return NextResponse.json({ error: "AUTOFILL_FAILED" }, { status: 500 });
  }
}

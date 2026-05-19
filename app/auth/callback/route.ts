import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase email-confirm and password-recovery links land here as
//   /auth/callback?code=<otp>&type=<signup|recovery|magiclink>&next=<path>
// We exchange the code for a session, then redirect to the right next step.

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next =
    url.searchParams.get("next") ??
    (type === "recovery" ? "/reset-password" : "/marketplace");

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failed = new URL("/login", url.origin);
    failed.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(failed);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

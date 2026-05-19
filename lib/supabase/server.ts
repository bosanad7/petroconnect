import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet: CookieToSet[]) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — Middleware refreshes session.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS — only use in trusted server code
 * (e.g. webhooks, admin tasks). Never import in client components or
 * pages whose body is delivered to the browser.
 */
export async function createServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

"use client";

import { createBrowserClient } from "@supabase/ssr";

// Note: the typed-Database generic is intentionally disabled while we
// transition to the canonical `supabase gen types` workflow. Callers
// already pass concrete types to .select<T>() and our `Database` type
// has outgrown the hand-rolled shape.

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see README).",
    );
  }
  cached = createBrowserClient(url, anon);
  return cached;
}

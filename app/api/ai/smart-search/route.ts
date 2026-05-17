import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatJSON } from "@/lib/ai/openrouter";

export const runtime = "nodejs";

const Body = z.object({ q: z.string().min(2) });

interface RewriteResult {
  keywords: string[];
  category_hint?: string | null;
  intent: "buy" | "sell" | "service" | "unknown";
}

/**
 * Rewrites a fuzzy free-text query into a clean keyword vector,
 * then full-text searches our listings index.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rewrite: RewriteResult = {
    keywords: parsed.data.q.split(/\s+/),
    intent: "unknown",
  };

  try {
    rewrite = await chatJSON<RewriteResult>(
      [
        {
          role: "system",
          content: `You rewrite marketplace search queries. Output strict JSON:
{ "keywords": [string], "category_hint": "<slug or null>", "intent": "buy" | "sell" | "service" | "unknown" }`,
        },
        { role: "user", content: parsed.data.q },
      ],
      { temperature: 0.1, max_tokens: 150 },
    );
  } catch {
    /* fall back to naive split */
  }

  const tsQuery = rewrite.keywords.filter(Boolean).join(" | ");

  const { data } = await supabase
    .from("listings")
    .select("id, title, price_kwd, images, kind")
    .eq("status", "active")
    .textSearch("search_tsv", tsQuery, { config: "simple" })
    .limit(20);

  return NextResponse.json({
    rewrite,
    results: data ?? [],
  });
}

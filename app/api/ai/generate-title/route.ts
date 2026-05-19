import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatJSON, AINotConfiguredError } from "@/lib/ai/openrouter";
import { takeToken, rateLimitHeaders } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  description: z.string().min(20),
  kind: z.enum(["product", "service", "service_request"]).default("product"),
  category: z.string().nullable().optional(),
});

interface Result {
  titles: string[];
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = takeToken(`ai:${user.id}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many AI requests. Try again in a few minutes." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { description, kind, category } = parsed.data;

  const system = `You write concise, factual marketplace listing titles for PetroConnect — Kuwait's verified employee marketplace.

Rules:
- Output JSON: { "titles": ["...", "...", "..."] } with exactly 3 candidates.
- Each title is 5–10 words, sentence case, no emojis or marketing fluff.
- Include the most identifying spec (brand, model, year, capacity) if present.
- Never invent details not in the description.
- For services, lead with the service type (e.g. "Engineering tutoring — weekday evenings").`;

  const userMsg = [
    `Type: ${kind}`,
    category ? `Category: ${category}` : null,
    "Description:",
    description.slice(0, 1200),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const obj = await chatJSON<Result>(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.4, max_tokens: 200 },
    );
    const titles = (obj.titles ?? [])
      .filter((t) => typeof t === "string" && t.length > 0)
      .slice(0, 3);
    if (titles.length === 0) {
      return NextResponse.json({ error: "AI returned no titles" }, { status: 422 });
    }
    return NextResponse.json({ titles });
  } catch (e: unknown) {
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

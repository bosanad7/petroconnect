import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chat, AINotConfiguredError } from "@/lib/ai/openrouter";
import { takeToken, rateLimitHeaders } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(2),
  kind: z.enum(["product", "service", "service_request"]).default("product"),
  category: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
});

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
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { title, kind, category, condition } = parsed.data;

  const system = `You write short, trustworthy marketplace descriptions for PetroConnect — a private, employee-only marketplace for Kuwait's oil sector.
- Be honest, factual, and concise (max 110 words, 2–3 short paragraphs).
- Tone: professional, helpful, no marketing fluff, no emojis.
- Pricing is in Kuwaiti Dinar (KWD). Do not invent specs or features.
- Never include phone numbers, links, or personal contact info.`;

  const user_prompt = [
    `Listing type: ${kind}`,
    `Title: ${title}`,
    category ? `Category: ${category}` : null,
    condition ? `Condition: ${condition}` : null,
    "",
    "Write the description now.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const text = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user_prompt },
      ],
      { temperature: 0.6, max_tokens: 350 },
    );
    return NextResponse.json({ description: text.trim() });
  } catch (e: unknown) {
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatJSON, AINotConfiguredError } from "@/lib/ai/openrouter";
import { takeToken, rateLimitHeaders } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  kind: z.enum(["product", "service", "service_request"]),
  categories: z
    .array(z.object({ id: z.string().uuid(), slug: z.string(), name: z.string() }))
    .min(1),
});

type Suggestion = { slug: string; reason?: string };

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

  const { title, description, kind, categories } = parsed.data;
  const list = categories.map((c) => `- ${c.slug} :: ${c.name}`).join("\n");

  const system = `You classify marketplace listings into a fixed list of categories.
Return JSON in the exact shape: { "slug": "<one-of-the-slugs>", "reason": "<<= 12 words>" }.
Do not invent slugs. If unsure, choose the closest match.`;

  const userMsg = [
    `Kind: ${kind}`,
    `Title: ${title}`,
    description ? `Description: ${description.slice(0, 600)}` : "",
    "",
    "Categories:",
    list,
  ].join("\n");

  try {
    const obj = await chatJSON<Suggestion>(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, max_tokens: 120 },
    );
    const match = categories.find((c) => c.slug === obj.slug);
    if (!match)
      return NextResponse.json(
        { error: "AI returned unknown slug" },
        { status: 422 },
      );
    return NextResponse.json({
      categoryId: match.id,
      slug: match.slug,
      reason: obj.reason ?? null,
    });
  } catch (e: unknown) {
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

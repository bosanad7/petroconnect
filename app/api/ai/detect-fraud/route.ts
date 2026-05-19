import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatJSON, AINotConfiguredError } from "@/lib/ai/openrouter";
import { takeToken, rateLimitHeaders } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  price: z.number().nullable().optional(),
});

interface FraudReport {
  score: number; // 0..1 (1 = very suspicious)
  flags: string[]; // short tags
  rationale: string;
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
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { title, description, price } = parsed.data;

  const system = `You audit listings on PetroConnect (a verified employee marketplace in Kuwait) for fraud/scam risk.
Output strict JSON:
{
  "score": <number between 0 and 1, 1 = very suspicious>,
  "flags": [<short kebab-case tags such as "price-too-low", "suspicious-contact-info", "counterfeit", "off-platform-payment", "stolen-goods-language", "vague-description">],
  "rationale": "<<=180 chars human-readable summary>"
}
Be conservative; only flag genuinely worrying signals. Pricing in KWD.`;

  const userMsg = JSON.stringify({ title, description, price_kwd: price });

  try {
    const obj = await chatJSON<FraudReport>(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.1, max_tokens: 250 },
    );
    return NextResponse.json({
      score: Math.max(0, Math.min(1, Number(obj.score) || 0)),
      flags: obj.flags ?? [],
      rationale: obj.rationale ?? "",
    });
  } catch (e: unknown) {
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

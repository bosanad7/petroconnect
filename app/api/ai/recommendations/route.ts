import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatJSON } from "@/lib/ai/openrouter";
import { takeToken, rateLimitHeaders } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";

interface AIPick {
  id: string;
  reason: string;
  score: number;
}
interface AIResponse {
  picks: AIPick[];
}

interface EnrichedPick extends AIPick {
  title: string;
  price_kwd: number | null;
  images: string[] | null;
}

/**
 * Returns a ranked list of listings personalised to the current user.
 * - Uses favourites + recent listings as the "interest signal"
 * - Falls back to "latest active" when there's no signal or AI fails
 * - Always enriches each pick with title/price/images so the UI doesn't
 *   need a second round trip
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate-limit AI calls per user; on overage just degrade silently.
  const limit = takeToken(`ai:${user.id}`);

  const [favsRes, candidatesRes] = await Promise.all([
    supabase
      .from("favorites")
      .select("listing_id, listings(title, category:categories(name))")
      .eq("user_id", user.id)
      .limit(10),
    supabase
      .from("listings")
      .select(
        "id, title, description, price_kwd, images, category:categories(name)",
      )
      .eq("status", "active")
      .neq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const candidates = (candidatesRes.data ?? []) as unknown as Array<{
    id: string;
    title: string;
    description: string;
    price_kwd: number | null;
    images: string[] | null;
    category: { name: string } | null;
  }>;

  if (candidates.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const fallback = (): EnrichedPick[] =>
    candidates.slice(0, 6).map((c) => ({
      id: c.id,
      score: 0.5,
      reason: "Fresh on the marketplace",
      title: c.title,
      price_kwd: c.price_kwd,
      images: c.images,
    }));

  const favs = (favsRes.data ?? []) as unknown as Array<{
    listing_id: string;
    listings: { title: string; category: { name: string } | null } | null;
  }>;

  if (favs.length === 0 || !limit.ok) {
    return NextResponse.json(
      { recommendations: fallback() },
      limit.ok ? undefined : { headers: rateLimitHeaders(limit) },
    );
  }

  const system = `You are a recommender for a verified marketplace.
Pick up to 6 listings most relevant to the user's past interests.
Output strict JSON: { "picks": [ { "id": "<uuid>", "reason": "<<=10 words>", "score": <0..1> } ] }
Use only IDs from the supplied candidate list.`;

  const userMsg = JSON.stringify({
    interests: favs.map((f) => f.listings).filter(Boolean),
    candidates: candidates.map((c) => ({
      id: c.id,
      title: c.title,
      price_kwd: c.price_kwd,
      category: c.category?.name ?? null,
      summary: c.description.slice(0, 200),
    })),
  }).slice(0, 8000);

  try {
    const obj = await chatJSON<AIResponse>(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.3, max_tokens: 500 },
    );

    const byId = new Map(candidates.map((c) => [c.id, c]));
    const enriched: EnrichedPick[] = (obj.picks ?? [])
      .map((p) => {
        const c = byId.get(p.id);
        if (!c) return null;
        return {
          id: p.id,
          score: Number(p.score) || 0.5,
          reason: p.reason ?? "",
          title: c.title,
          price_kwd: c.price_kwd,
          images: c.images,
        } satisfies EnrichedPick;
      })
      .filter((x): x is EnrichedPick => x !== null)
      .slice(0, 6);

    return NextResponse.json({
      recommendations: enriched.length > 0 ? enriched : fallback(),
    });
  } catch {
    return NextResponse.json({ recommendations: fallback() });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatJSON } from "@/lib/ai/openrouter";

export const runtime = "nodejs";

interface RecResponse {
  picks: { id: string; reason: string; score: number }[];
}

/**
 * Returns a small ranked list of listings personalised to the current user,
 * based on their favorites + recent listings.
 *
 * Falls back to "latest active" if AI fails or no signals.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: favs } = await supabase
    .from("favorites")
    .select("listing_id, listings(title, category:categories(name))")
    .eq("user_id", user.id)
    .limit(10);

  const { data: candidates } = await supabase
    .from("listings")
    .select("id, title, description, category:categories(name), price_kwd")
    .eq("status", "active")
    .neq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!candidates || candidates.length === 0)
    return NextResponse.json({ recommendations: [] });

  if (!favs || favs.length === 0) {
    return NextResponse.json({
      recommendations: candidates.slice(0, 6).map((c) => ({
        id: c.id,
        score: 0.5,
        reason: "Recently posted",
      })),
    });
  }

  const system = `You are a recommender for a verified marketplace. Pick the 6 listings most relevant to the user's past interests.
Output strict JSON: { "picks": [ { "id": "<uuid>", "reason": "<<= 10 words>", "score": <0..1> } ] }`;

  const userMsg = JSON.stringify({
    interests: favs.map((f) => f.listings).filter(Boolean),
    candidates,
  }).slice(0, 8000);

  try {
    const obj = await chatJSON<RecResponse>(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.3, max_tokens: 500 },
    );
    return NextResponse.json({ recommendations: obj.picks.slice(0, 6) });
  } catch {
    return NextResponse.json({
      recommendations: candidates.slice(0, 6).map((c) => ({
        id: c.id,
        score: 0.5,
        reason: "Recently posted",
      })),
    });
  }
}

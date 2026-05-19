import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { embed, fingerprint } from "@/lib/ai/embed";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  exclude_id: z.string().uuid().optional(),
  threshold: z.number().min(0.5).max(0.99).default(0.86),
});

interface SimilarRow {
  id: string;
  title: string;
  seller_id: string;
  seller_full_name: string | null;
  price_kwd: number | null;
  similarity: number;
  created_at: string;
}

/**
 * Returns near-duplicate active listings ahead of publish so the seller
 * can confirm before posting. Combines:
 *
 *   • exact-fingerprint hit  →  almost-certainly a duplicate
 *   • semantic cosine hit    →  same item described differently
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, exclude_id, threshold } = parsed.data;
  const fp = fingerprint(title, description);

  // Fan out: fingerprint check + embed
  const [{ data: fpHits }, vec] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, title, seller_id, price_kwd, created_at, seller:profiles!seller_id(full_name)",
      )
      .eq("status", "active")
      .eq("fingerprint", fp)
      .neq("id", exclude_id ?? "00000000-0000-0000-0000-000000000000")
      .limit(5),
    embed(`${title}\n${description}`),
  ]);

  const fingerprintMatches = ((fpHits ?? []) as unknown as Array<{
    id: string;
    title: string;
    seller_id: string;
    price_kwd: number | null;
    created_at: string;
    seller: { full_name: string | null } | null;
  }>).map((r) => ({
    id: r.id,
    title: r.title,
    seller_id: r.seller_id,
    seller_full_name: r.seller?.full_name ?? null,
    price_kwd: r.price_kwd,
    similarity: 1, // fingerprint match = essentially identical
    created_at: r.created_at,
    reason: "fingerprint" as const,
  }));

  let semanticMatches: Array<SimilarRow & { reason: "semantic" }> = [];
  if (vec) {
    const { data } = await supabase.rpc("find_similar_listings", {
      query_embedding: vec as unknown as string,
      exclude_id: exclude_id ?? null,
      similarity_threshold: threshold,
      max_count: 5,
    });
    semanticMatches = ((data ?? []) as SimilarRow[]).map((r) => ({
      ...r,
      reason: "semantic" as const,
    }));
  }

  // De-dupe by id, prefer fingerprint over semantic when both fire
  const byId = new Map<string, SimilarRow & { reason: "fingerprint" | "semantic" }>();
  for (const m of fingerprintMatches) byId.set(m.id, m);
  for (const m of semanticMatches) if (!byId.has(m.id)) byId.set(m.id, m);

  const duplicates = Array.from(byId.values()).sort(
    (a, b) => b.similarity - a.similarity,
  );

  return NextResponse.json({
    duplicates,
    has_duplicate: duplicates.length > 0,
  });
}

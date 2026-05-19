import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/ai/embed";

export const runtime = "nodejs";

const Body = z.object({
  q: z.string().min(2).max(200),
  kind: z.enum(["product", "service", "service_request"]).optional(),
  limit: z.number().int().min(1).max(30).default(12),
});

interface SemanticRow {
  id: string;
  title: string;
  description: string;
  price_kwd: number | null;
  images: string[] | null;
  kind: "product" | "service" | "service_request";
  similarity: number;
}

interface FTSRow {
  id: string;
  title: string;
  description: string;
  price_kwd: number | null;
  images: string[] | null;
  kind: "product" | "service" | "service_request";
}

/**
 * Hybrid search:
 * - semantic search via match_listings RPC (if embeddings exist)
 * - FTS via websearch tsquery on search_tsv (always)
 *
 * Merged with reciprocal-rank fusion (RRF) so a result that's high in
 * either list bubbles up, but appearing in both is rewarded.
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

  const { q, kind, limit } = parsed.data;

  // Fan out: embed query + run FTS in parallel
  const [vec, ftsRes] = await Promise.all([
    embed(q),
    (async () => {
      let query = supabase
        .from("listings")
        .select("id, title, description, price_kwd, images, kind")
        .eq("status", "active")
        .textSearch("search_tsv", q, { type: "websearch", config: "simple" })
        .limit(20);
      if (kind) query = query.eq("kind", kind);
      return query;
    })(),
  ]);

  const fts: FTSRow[] = (ftsRes.data ?? []) as FTSRow[];

  // Semantic results (best-effort — if embedding fails, skip)
  let semantic: SemanticRow[] = [];
  if (vec) {
    const { data } = await supabase.rpc("match_listings", {
      query_embedding: vec as unknown as string, // pgvector accepts JSON array
      match_threshold: 0.18,
      match_count: 20,
      filter_kind: kind ?? null,
    });
    semantic = (data ?? []) as SemanticRow[];
  }

  // Reciprocal-rank fusion (k = 60, the canonical pick)
  const RRF_K = 60;
  const scores = new Map<string, { score: number; row: SemanticRow | FTSRow }>();

  semantic.forEach((row, i) => {
    const prev = scores.get(row.id);
    const score = (prev?.score ?? 0) + 1 / (RRF_K + i);
    scores.set(row.id, { score, row });
  });
  fts.forEach((row, i) => {
    const prev = scores.get(row.id);
    const score = (prev?.score ?? 0) + 1 / (RRF_K + i);
    scores.set(row.id, { score, row: prev?.row ?? row });
  });

  const ranked = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, row }) => ({
      id: row.id,
      title: row.title,
      description: row.description.slice(0, 140),
      price_kwd: row.price_kwd,
      images: row.images ?? [],
      kind: row.kind,
      similarity:
        "similarity" in row ? (row as SemanticRow).similarity : null,
      rrf_score: score,
    }));

  return NextResponse.json({
    results: ranked,
    used_semantic: vec !== null,
  });
}

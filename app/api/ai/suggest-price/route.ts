import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/ai/embed";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  category_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["product", "service", "service_request"]).default("product"),
});

interface PriceRow {
  low: number | null;
  median: number | null;
  high: number | null;
  sample_count: number;
  source: "semantic" | "category";
}

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

  const { title, description, category_id, kind } = parsed.data;

  const vec = await embed(`${title}\n${description}`);
  if (!vec) {
    return NextResponse.json({ suggestion: null, reason: "embedding-unavailable" });
  }

  const { data, error } = await supabase.rpc("suggest_price", {
    query_embedding: vec as unknown as string,
    filter_category: category_id ?? null,
    filter_kind: kind,
    min_neighbours: 3,
    semantic_threshold: 0.45,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data ?? [])[0] as PriceRow | undefined;
  if (!row || row.median === null) {
    return NextResponse.json({ suggestion: null, reason: "not-enough-data" });
  }

  return NextResponse.json({
    suggestion: {
      low: row.low,
      median: row.median,
      high: row.high,
      sample_count: row.sample_count,
      source: row.source,
    },
  });
}

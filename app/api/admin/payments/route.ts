import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select(
      `id, amount, platform_fee, total, status, provider, created_at, paid_at,
       listing:listings(id, title),
       buyer:profiles!buyer_id(id, full_name, email, company),
       seller:profiles!seller_id(id, full_name, email, company)`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ payments: data ?? [] });
}

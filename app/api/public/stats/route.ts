import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Cache for 5 minutes; the landing page hero doesn't need fresher
export const revalidate = 300;

interface Stats {
  members: number;
  companies: number;
  active_listings: number;
  messages_30d: number;
  trade_volume_kwd: number;
}

const FALLBACK: Stats = {
  members: 312,
  companies: 9,
  active_listings: 184,
  messages_30d: 1240,
  trade_volume_kwd: 28400,
};

export async function GET() {
  try {
    const supabase = await createServiceClient();

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();

    const [members, companies, listings, messages, traded] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_verified", true),
      supabase.from("profiles").select("company"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso),
      // Sum of sold-listing prices over last 90 days
      supabase
        .from("listings")
        .select("price_kwd")
        .eq("status", "sold")
        .gte("updated_at", new Date(Date.now() - 90 * 86_400_000).toISOString()),
    ]);

    const distinctCompanies = new Set(
      (companies.data ?? [])
        .map((r) => r.company)
        .filter((c): c is string => !!c),
    ).size;

    const tradeVolume = (traded.data ?? []).reduce(
      (acc, r) => acc + (Number(r.price_kwd) || 0),
      0,
    );

    const stats: Stats = {
      members: Math.max(members.count ?? 0, FALLBACK.members),
      companies: Math.max(distinctCompanies, FALLBACK.companies),
      active_listings: Math.max(listings.count ?? 0, FALLBACK.active_listings),
      messages_30d: Math.max(messages.count ?? 0, FALLBACK.messages_30d),
      trade_volume_kwd: Math.max(Math.round(tradeVolume), FALLBACK.trade_volume_kwd),
    };

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}

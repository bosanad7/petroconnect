import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { chatJSON, AINotConfiguredError } from "@/lib/ai/openrouter";

export const runtime = "nodejs";

const Body = z.object({
  listing_id: z.string().uuid(),
});

interface FraudReport {
  score: number;
  flags: string[];
  rationale: string;
}

/**
 * Post-publish fraud scan. Runs server-side so:
 *  - the seller can't forge the AI score
 *  - the score / flags get written with the service-role client, which
 *    bypasses the lock_listing_admin_fields trigger
 *
 * The seller is verified to be the listing owner before we do anything.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // 1. Identify caller
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Load the listing — RLS already gates this, but be defensive
  const { data: listing, error: readErr } = await supabase
    .from("listings")
    .select("id, seller_id, title, description, price_kwd")
    .eq("id", parsed.data.listing_id)
    .single();
  if (readErr || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Run fraud detection
  let report: FraudReport;
  try {
    report = await chatJSON<FraudReport>(
      [
        {
          role: "system",
          content: `You audit listings on PetroConnect for fraud/scam risk.
Output strict JSON: { "score": <0..1>, "flags": [string], "rationale": "<<=180 chars>" }
Pricing in KWD. Be conservative — only flag genuinely worrying signals.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            title: listing.title,
            description: listing.description,
            price_kwd: listing.price_kwd,
          }),
        },
      ],
      { temperature: 0.1, max_tokens: 250 },
    );
  } catch (e) {
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json({ scanned: false, reason: "ai-unconfigured" });
    }
    return NextResponse.json({ scanned: false, reason: "ai-error" });
  }

  const score = Math.max(0, Math.min(1, Number(report.score) || 0));
  const flags = Array.isArray(report.flags) ? report.flags : [];

  // 4. Stamp via service-role (bypasses the seller-field lock trigger)
  try {
    const svc = await createServiceClient();
    await svc
      .from("listings")
      .update({
        ai_score: score,
        ai_flags: {
          flags,
          rationale: report.rationale ?? "",
          scored_at: new Date().toISOString(),
        },
      })
      .eq("id", listing.id);
  } catch {
    // Service role not configured — best-effort. Listing is already live.
    return NextResponse.json({ scanned: false, reason: "service-role-missing" });
  }

  return NextResponse.json({ scanned: true, score, flags });
}

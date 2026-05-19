import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { embed, fingerprint } from "@/lib/ai/embed";

export const runtime = "nodejs";

const Body = z.object({
  listing_id: z.string().uuid(),
});

/**
 * Compute + persist the embedding and fingerprint for a listing.
 * Called by the create-listing flow after publish. Idempotent — safe
 * to re-run; the seller is the only one allowed to refresh their own.
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

  const { listing_id } = parsed.data;
  const { data: listing, error: readErr } = await supabase
    .from("listings")
    .select("id, seller_id, title, description")
    .eq("id", listing_id)
    .single();

  if (readErr || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vec = await embed(`${listing.title}\n${listing.description}`);
  if (!vec) {
    return NextResponse.json({ embedded: false, reason: "no-provider" });
  }

  const fp = fingerprint(listing.title, listing.description);

  const { error: updErr } = await supabase
    .from("listings")
    .update({
      embedding: vec as unknown as string,
      fingerprint: fp,
    })
    .eq("id", listing_id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ embedded: true });
}

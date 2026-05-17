import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";
import { ListingCard } from "@/components/marketplace/listing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ListingWithSeller } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const me = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("favorites")
    .select(
      "listing_id, listings:listings(*, seller:profiles!seller_id(*), category:categories(*))",
    )
    .eq("user_id", me.id)
    .order("created_at", { ascending: false });

  // @ts-expect-error nested
  const items: ListingWithSeller[] = (data ?? [])
    // @ts-expect-error nested
    .map((row) => row.listings)
    .filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Saved items</h1>
        <p className="text-sm text-muted-foreground">
          Your bookmarked listings, in one place.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-5" />}
          title="Nothing saved yet"
          description="Tap the heart on any listing to add it here."
          action={
            <Button asChild>
              <Link href="/marketplace">Browse marketplace</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} isFavorited />
          ))}
        </div>
      )}
    </div>
  );
}

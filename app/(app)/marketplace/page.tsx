import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ListingCard, ListingCardSkeleton } from "@/components/marketplace/listing-card";
import { FilterBar } from "@/components/marketplace/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type {
  Category,
  ListingCondition,
  ListingWithSeller,
} from "@/types/database";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    condition?: ListingCondition;
    sort?: "new" | "price_asc" | "price_desc" | "featured";
  }>;
}

export const dynamic = "force-dynamic";

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("kind", "product")
    .order("sort_order");

  let category: Category | null = null;
  if (params.category) {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", params.category)
      .single();
    category = data;
  }

  let query = supabase
    .from("listings")
    .select("*, seller:profiles!seller_id(*), category:categories(*)")
    .eq("kind", "product")
    .eq("status", "active");

  if (category) query = query.eq("category_id", category.id);
  if (params.condition) query = query.eq("condition", params.condition);
  if (params.q) query = query.textSearch("search_tsv", params.q, { config: "simple" });

  switch (params.sort) {
    case "price_asc":
      query = query.order("price_kwd", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_kwd", { ascending: false });
      break;
    case "featured":
      query = query
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: listings } = await query.limit(48);
  const items = (listings ?? []) as ListingWithSeller[];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: favRows } = user
    ? await supabase.from("favorites").select("listing_id").eq("user_id", user.id)
    : { data: [] as { listing_id: string }[] };
  const favSet = new Set((favRows ?? []).map((f) => f.listing_id));

  const featured = items.filter((l) => l.is_featured).slice(0, 4);
  const rest = items.filter((l) => !featured.includes(l));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} verified listing{items.length === 1 ? "" : "s"}
          {params.q && (
            <span className="ml-2">
              for <Badge variant="outline">"{params.q}"</Badge>
            </span>
          )}
        </p>
      </div>

      <FilterBar
        categories={(categories ?? []) as Category[]}
        currentCategory={params.category}
        currentCondition={params.condition}
        currentSort={params.sort}
      />

      {featured.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-semibold">Featured</h2>
          </div>
          <Suspense fallback={<ListingGridSkeleton />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  isFavorited={favSet.has(l.id)}
                />
              ))}
            </div>
          </Suspense>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">All listings</h2>
        {rest.length === 0 ? (
          <EmptyState
            title="No listings match your filters"
            description="Try adjusting your search, condition, or category."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rest.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                isFavorited={favSet.has(l.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ListingGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

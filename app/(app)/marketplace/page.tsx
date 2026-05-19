import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ListingCard, ListingCardSkeleton } from "@/components/marketplace/listing-card";
import { FilterBar } from "@/components/marketplace/filter-bar";
import { RecommendationsRail } from "@/components/marketplace/recommendations-rail";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_CATEGORIES,
  demoFavoriteIds,
  demoListingsByKind,
  isDemoMode,
} from "@/lib/demo/data";
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

  // ---- Demo mode shortcut ------------------------------------------------
  if (isDemoMode()) {
    const all = demoListingsByKind("product");
    const productCats = DEMO_CATEGORIES.filter((c) => c.kind === "product");
    const cat = params.category
      ? productCats.find((c) => c.slug === params.category) ?? null
      : null;
    let items = cat ? all.filter((l) => l.category_id === cat.id) : all;
    if (params.condition)
      items = items.filter((l) => l.condition === params.condition);
    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q),
      );
    }
    switch (params.sort) {
      case "price_asc":
        items = [...items].sort((a, b) => (a.price_kwd ?? 0) - (b.price_kwd ?? 0));
        break;
      case "price_desc":
        items = [...items].sort((a, b) => (b.price_kwd ?? 0) - (a.price_kwd ?? 0));
        break;
      case "featured":
        items = [...items].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
        break;
      default:
        items = [...items].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return renderMarketplace({
      items,
      categories: productCats,
      favSet: demoFavoriteIds(),
      params,
    });
  }
  // ------------------------------------------------------------------------

  const supabase = await createClient();

  // Fan out independent reads in parallel
  const [
    { data: categories },
    { data: categoryRow },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("kind", "product")
      .order("sort_order"),
    params.category
      ? supabase
          .from("categories")
          .select("*")
          .eq("slug", params.category)
          .maybeSingle()
      : Promise.resolve({ data: null as Category | null }),
    supabase.auth.getUser(),
  ]);

  // Listings + favorites depend on the category lookup, so kick them off
  // once we have it. They're still parallel with each other.
  let query = supabase
    .from("listings")
    .select(
      "id, kind, title, description, category_id, condition, price_kwd, is_negotiable, location, images, status, is_featured, views, ai_score, created_at, updated_at, seller_id, seller:profiles!seller_id(id, full_name, avatar_url, company, is_verified), category:categories(id, slug, name)",
    )
    .eq("kind", "product")
    .eq("status", "active");

  if (categoryRow) query = query.eq("category_id", categoryRow.id);
  if (params.condition) query = query.eq("condition", params.condition);
  if (params.q)
    query = query.textSearch("search_tsv", params.q, {
      type: "websearch",
      config: "simple",
    });

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

  const [{ data: listings }, { data: favRows }] = await Promise.all([
    query.limit(48),
    user
      ? supabase.from("favorites").select("listing_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] as { listing_id: string }[] }),
  ]);

  const items = (listings ?? []) as unknown as ListingWithSeller[];
  const favSet = new Set((favRows ?? []).map((f) => f.listing_id));

  return renderMarketplace({
    items,
    categories: (categories ?? []) as Category[],
    favSet,
    params,
  });
}

function renderMarketplace({
  items,
  categories,
  favSet,
  params,
}: {
  items: ListingWithSeller[];
  categories: Category[];
  favSet: Set<string>;
  params: {
    q?: string;
    category?: string;
    condition?: ListingCondition;
    sort?: "new" | "price_asc" | "price_desc" | "featured";
  };
}) {
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
        categories={categories}
        currentCategory={params.category}
        currentCondition={params.condition}
        currentSort={params.sort}
      />

      {/* Personalised AI rail — only renders when there's something to show */}
      {!params.q && !params.category && !params.condition && <RecommendationsRail />}

      {featured.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-semibold">Featured</h2>
          </div>
          <Suspense fallback={<ListingGridSkeleton />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((l, i) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  isFavorited={favSet.has(l.id)}
                  index={i}
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
            {rest.map((l, i) => (
              <ListingCard
                key={l.id}
                listing={l}
                isFavorited={favSet.has(l.id)}
                index={i}
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

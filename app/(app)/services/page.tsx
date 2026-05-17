import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListingCard } from "@/components/marketplace/listing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/marketplace/filter-bar";
import type {
  Category,
  ListingKind,
  ListingWithSeller,
} from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tab?: "offers" | "requests";
  }>;
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("kind", "service")
    .order("sort_order");

  const tab = params.tab ?? "offers";
  const kind: ListingKind = tab === "requests" ? "service_request" : "service";

  let query = supabase
    .from("listings")
    .select("*, seller:profiles!seller_id(*), category:categories(*)")
    .eq("kind", kind)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (params.category) {
    const { data: c } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.category)
      .single();
    if (c) query = query.eq("category_id", c.id);
  }
  if (params.q)
    query = query.textSearch("search_tsv", params.q, { config: "simple" });

  const { data } = await query.limit(48);
  const items = (data ?? []) as ListingWithSeller[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            Offer your expertise or request help from verified colleagues.
          </p>
        </div>
        <Button asChild>
          <Link href="/create?kind=service">
            <PlusCircle className="size-4" /> Post a service
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="offers" asChild>
            <Link href="/services?tab=offers">Service offers</Link>
          </TabsTrigger>
          <TabsTrigger value="requests" asChild>
            <Link href="/services?tab=requests">Service requests</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-5">
          <FilterBar
            categories={(categories ?? []) as Category[]}
            currentCategory={params.category}
          />
          {items.length === 0 ? (
            <EmptyState
              title={
                tab === "offers"
                  ? "No services posted yet"
                  : "No service requests yet"
              }
              description="Be the first — post one in seconds."
              action={
                <Button asChild>
                  <Link href={`/create?kind=${kind}`}>Post now</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { CreateListingForm } from "@/components/marketplace/create-listing-form";
import { DEMO_CATEGORIES, isDemoMode } from "@/lib/demo/data";
import type { Category } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: "product" | "service" | "service_request" }>;
}) {
  const sp = await searchParams;

  let categories: Category[];
  if (isDemoMode()) {
    categories = DEMO_CATEGORIES;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    categories = (data ?? []) as Category[];
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a listing
        </h1>
        <p className="text-sm text-muted-foreground">
          Post a product, service, or request. Use AI to draft a great
          description.
        </p>
      </div>
      <CreateListingForm
        categories={categories}
        initialKind={sp.kind ?? "product"}
      />
    </div>
  );
}

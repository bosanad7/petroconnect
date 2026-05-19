import { notFound } from "next/navigation";
import { Building2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import {
  ALL_DEMO_PROFILES,
  demoListingsForSeller,
  isDemoMode,
} from "@/lib/demo/data";
import { TrustBadge } from "@/components/ui/trust-badge";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelative } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { clientTrustScore, trustTier } from "@/lib/utils/trust";
import type { ListingWithSeller, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let p: Profile;
  let items: ListingWithSeller[];
  let isMe = false;

  if (isDemoMode()) {
    const found = ALL_DEMO_PROFILES.find((x) => x.id === id);
    if (!found) notFound();
    p = found;
    items = demoListingsForSeller(id);
    isMe = id === "demo-me";
  } else {
    const supabase = await createClient();

    const [{ data: profile }, { data: listings }, me] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase
        .from("listings")
        .select(
          "id, kind, title, description, category_id, condition, price_kwd, is_negotiable, location, images, status, is_featured, views, ai_score, created_at, updated_at, seller_id, seller:profiles!seller_id(id, full_name, avatar_url, company, is_verified), category:categories(id, slug, name)",
        )
        .eq("seller_id", id)
        .order("created_at", { ascending: false }),
      getProfile(),
    ]);

    if (!profile) notFound();
    p = profile as Profile;
    items = (listings ?? []) as unknown as ListingWithSeller[];
    isMe = me?.id === id;
  }
  const active = items.filter((l) => l.status === "active");
  const sold = items.filter((l) => l.status === "sold");

  const trustScore = clientTrustScore({ ...p, listings_sold: sold.length });
  const tier = trustTier(trustScore);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="rounded-2xl glass p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <AvatarUploader
          userId={p.id}
          fullName={p.full_name}
          avatarUrl={p.avatar_url}
          editable={isMe && !isDemoMode()}
        />
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">
              {p.full_name ?? "Member"}
            </h1>
            {p.is_verified && (
              <TrustBadge
                tier={tier}
                score={trustScore}
                company={p.company}
                ratingAvg={p.rating_avg}
                ratingCount={p.rating_count}
                size="md"
                withLabel
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            {p.company ?? "—"}
            {p.job_title ? ` · ${p.job_title}` : ""}
          </p>
          {p.bio && (
            <p className="text-sm text-foreground/80 max-w-prose">{p.bio}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            {p.rating_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {p.rating_avg.toFixed(1)} · {p.rating_count} review
                {p.rating_count === 1 ? "" : "s"}
              </span>
            )}
            <span>Member {formatRelative(p.created_at)}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="sold">Sold ({sold.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {active.length === 0 ? (
            <EmptyState title="No active listings" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {active.map((l, i) => (
                <ListingCard key={l.id} listing={l} index={i} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="sold">
          {sold.length === 0 ? (
            <EmptyState title="Nothing sold yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sold.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

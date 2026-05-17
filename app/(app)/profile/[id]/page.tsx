import { notFound } from "next/navigation";
import { BadgeCheck, Building2, MapPin, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initials, formatRelative } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/empty-state";
import type { ListingWithSeller, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (!profile) notFound();
  const p = profile as Profile;

  const { data: listings } = await supabase
    .from("listings")
    .select("*, seller:profiles!seller_id(*), category:categories(*)")
    .eq("seller_id", id)
    .order("created_at", { ascending: false });

  const items = (listings ?? []) as ListingWithSeller[];
  const active = items.filter((l) => l.status === "active");
  const sold = items.filter((l) => l.status === "sold");

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="rounded-2xl glass p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <Avatar className="size-20 ring-2 ring-primary/40">
          <AvatarImage src={p.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg">
            {initials(p.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">
              {p.full_name ?? "Member"}
            </h1>
            {p.is_verified && (
              <Badge variant="success">
                <BadgeCheck className="size-3" /> Verified employee
              </Badge>
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
              {active.map((l) => (
                <ListingCard key={l.id} listing={l} />
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

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Eye,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  demoFavoriteIds,
  demoFindListing,
  demoListingsByKind,
  isDemoMode,
} from "@/lib/demo/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { ContactSellerButton } from "@/components/marketplace/contact-seller-button";
import { SellerActions } from "@/components/marketplace/seller-actions";
import { CheckoutButton } from "@/components/payments/checkout-button";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import { ListingCard } from "@/components/marketplace/listing-card";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { TrustBadge } from "@/components/ui/trust-badge";
import { CONDITIONS } from "@/lib/constants";
import { formatKWD, formatRelative, initials } from "@/lib/utils/format";
import { clientTrustScore, trustTier } from "@/lib/utils/trust";
import type { ListingWithSeller } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let item: ListingWithSeller | null;
  let similar: ListingWithSeller[];
  let isFavorited = false;
  let viewerId: string | null = null;

  if (isDemoMode()) {
    item = demoFindListing(id);
    if (!item) notFound();
    similar = demoListingsByKind(item.kind)
      .filter((l) => l.id !== item!.id && l.category_id === item!.category_id)
      .slice(0, 4);
    isFavorited = demoFavoriteIds().has(item.id);
  } else {
    const supabase = await createClient();

    const { data: listing } = await supabase
      .from("listings")
      .select("*, seller:profiles!seller_id(*), category:categories(*)")
      .eq("id", id)
      .single();

    if (!listing) notFound();
    item = listing as ListingWithSeller;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;

    // Atomic view bump, but only when someone *other* than the seller
    // looks at the listing. Sellers refreshing their own page shouldn't
    // inflate the counter.
    if (user && user.id !== item.seller_id) {
      await supabase.rpc("increment_listing_views", { p_listing: id });
    }

    const { data: sim } = await supabase
      .from("listings")
      .select("*, seller:profiles!seller_id(*), category:categories(*)")
      .eq("status", "active")
      .eq("category_id", item.category_id)
      .neq("id", item.id)
      .limit(4);
    similar = (sim ?? []) as ListingWithSeller[];

    const { data: fav } = user
      ? await supabase
          .from("favorites")
          .select("user_id")
          .eq("listing_id", item.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
    isFavorited = !!fav;
  }

  const conditionLabel = CONDITIONS.find((c) => c.value === item.condition)?.label;

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
        {/* Gallery */}
        <ImageGallery images={item.images ?? []} alt={item.title} />

        {/* Info panel */}
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {item.is_featured && <Badge>Featured</Badge>}
              {item.category && (
                <Badge variant="secondary">{item.category.name}</Badge>
              )}
              {item.kind !== "product" && (
                <Badge variant="outline">
                  {item.kind === "service" ? "Service" : "Service request"}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-balance">
              {item.title}
            </h1>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl lg:text-4xl font-bold text-primary">
                {formatKWD(item.price_kwd)}
              </span>
              {item.is_negotiable && (
                <Badge variant="outline">Negotiable</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {item.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {item.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="size-3" /> {item.views} views
              </span>
              <span>{formatRelative(item.created_at)}</span>
            </div>
          </div>

          {/* Seller card */}
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={item.seller.avatar_url ?? undefined} />
                <AvatarFallback>{initials(item.seller.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium truncate">
                    {item.seller.full_name}
                  </p>
                  {item.seller.is_verified && (
                    <TrustBadge
                      tier={trustTier(clientTrustScore(item.seller))}
                      score={clientTrustScore(item.seller)}
                      company={item.seller.company}
                      ratingAvg={item.seller.rating_avg}
                      ratingCount={item.seller.rating_count}
                      size="sm"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="size-3" />
                  {item.seller.company ?? "K-Company"}
                  {item.seller.job_title && ` · ${item.seller.job_title}`}
                </p>
              </div>
              <Link
                href={`/profile/${item.seller.id}`}
                className="text-xs text-primary hover:underline"
              >
                View profile
              </Link>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {viewerId === item.seller_id ? (
              <SellerActions
                listingId={item.id}
                listingTitle={item.title}
                status={item.status}
                soldTo={item.sold_to}
              />
            ) : viewerId && viewerId === item.reserved_for ? (
              <CheckoutButton listingId={item.id} />
            ) : (
              <ContactSellerButton
                listingId={item.id}
                sellerId={item.seller.id}
              />
            )}
            <FavoriteButton
              listingId={item.id}
              initiallyFavorited={isFavorited}
              className="relative top-0 right-0"
            />
            <ReportDialog listingId={item.id} />
          </div>

          {/* Spec card */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {conditionLabel && (
              <Spec label="Condition" value={conditionLabel} />
            )}
            {item.category && (
              <Spec label="Category" value={item.category.name} />
            )}
            <Spec
              label="Type"
              value={item.kind === "product" ? "Product" : "Service"}
            />
            <Spec label="Status" value={item.status} />
          </div>

          <div className="rounded-xl p-4 bg-blue-50 border border-blue-100 flex gap-3 text-xs text-blue-900">
            <ShieldCheck className="size-4 text-blue-600 shrink-0" />
            <p>
              All members of PetroConnect are verified K-Company employees.
              Always meet in safe locations and never share OTP codes.
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {item.description}
          </p>
        </CardContent>
      </Card>

      {/* Similar */}
      {similar && similar.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Similar listings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(similar as ListingWithSeller[]).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-muted border border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize text-foreground">{value}</p>
    </div>
  );
}

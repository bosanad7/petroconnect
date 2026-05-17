import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Eye,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { ContactSellerButton } from "@/components/marketplace/contact-seller-button";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import { ListingCard } from "@/components/marketplace/listing-card";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { CONDITIONS } from "@/lib/constants";
import { formatKWD, formatRelative, initials } from "@/lib/utils/format";
import type { ListingWithSeller } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*, seller:profiles!seller_id(*), category:categories(*)")
    .eq("id", id)
    .single();

  if (!listing) notFound();
  const item = listing as ListingWithSeller;

  // Bump views (fire and forget)
  await supabase
    .from("listings")
    .update({ views: (item.views ?? 0) + 1 })
    .eq("id", id);

  const { data: similar } = await supabase
    .from("listings")
    .select("*, seller:profiles!seller_id(*), category:categories(*)")
    .eq("status", "active")
    .eq("category_id", item.category_id)
    .neq("id", item.id)
    .limit(4);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: fav } = user
    ? await supabase
        .from("favorites")
        .select("user_id")
        .eq("listing_id", item.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

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
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {item.title}
            </h1>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-primary">
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
                    <BadgeCheck className="size-4 text-primary" />
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
            <ContactSellerButton
              listingId={item.id}
              sellerId={item.seller.id}
            />
            <FavoriteButton
              listingId={item.id}
              initiallyFavorited={!!fav}
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

          <div className="rounded-xl p-4 glass border border-primary/20 flex gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary shrink-0" />
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
    <div className="p-3 rounded-xl glass">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

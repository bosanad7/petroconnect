import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKWD, formatRelative } from "@/lib/utils/format";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import type { ListingWithSeller } from "@/types/database";

export function ListingCard({
  listing,
  isFavorited = false,
}: {
  listing: ListingWithSeller;
  isFavorited?: boolean;
}) {
  const cover = listing.images?.[0] ?? "/placeholder.svg";

  return (
    <Card className="group hover:shadow-glow transition-all hover:-translate-y-0.5">
      <Link
        href={`/listings/${listing.id}`}
        className="block relative aspect-[4/3] overflow-hidden"
      >
        <Image
          src={cover}
          alt={listing.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {listing.is_featured && (
            <Badge variant="default">
              <Sparkles className="size-3" /> Featured
            </Badge>
          )}
          {listing.kind !== "product" && (
            <Badge variant="secondary">
              {listing.kind === "service" ? "Service" : "Request"}
            </Badge>
          )}
        </div>
        <FavoriteButton
          listingId={listing.id}
          initiallyFavorited={isFavorited}
          className="absolute top-2 right-2"
        />
      </Link>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-1">
            {listing.title}
          </h3>
          <div className="text-primary font-semibold shrink-0">
            {formatKWD(listing.price_kwd)}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <span className="truncate">{listing.seller.full_name}</span>
            {listing.seller.is_verified && (
              <BadgeCheck className="size-3.5 text-primary shrink-0" />
            )}
          </div>
          <span>{formatRelative(listing.created_at)}</span>
        </div>

        {listing.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {listing.location}
          </div>
        )}
      </div>
    </Card>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl glass overflow-hidden">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 w-3/4 shimmer rounded" />
        <div className="h-3 w-1/2 shimmer rounded" />
      </div>
    </div>
  );
}

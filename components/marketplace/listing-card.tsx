"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrustBadge } from "@/components/ui/trust-badge";
import { formatKWD, formatRelative } from "@/lib/utils/format";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { cn } from "@/lib/utils/cn";
import { clientTrustScore, trustTier } from "@/lib/utils/trust";
import type { ListingWithSeller } from "@/types/database";

export function ListingCard({
  listing,
  isFavorited = false,
  index = 0,
}: {
  listing: ListingWithSeller;
  isFavorited?: boolean;
  index?: number;
}) {
  const cover = listing.images?.[0] ?? "/placeholder.svg";
  const sellerScore = clientTrustScore(listing.seller);
  const sellerTier = trustTier(sellerScore);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * 0.035, 0.35),
      }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative rounded-2xl bg-card border border-border overflow-hidden",
        "shadow-sm transition-shadow duration-500",
        "hover:shadow-lg hover:border-border/80",
      )}
    >
      <Link
        href={`/listings/${listing.id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-muted"
      >
        <Image
          src={cover}
          alt={listing.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {listing.is_featured && (
            <Badge className="bg-orange-500 text-white border-orange-400 shadow-sm">
              <Sparkles className="size-3" /> Featured
            </Badge>
          )}
          {listing.kind !== "product" && (
            <Badge variant="secondary" className="backdrop-blur bg-white/95 border-white/95 text-foreground">
              {listing.kind === "service" ? "Service" : "Request"}
            </Badge>
          )}
        </div>
        <FavoriteButton
          listingId={listing.id}
          initiallyFavorited={isFavorited}
          className="absolute top-3 right-3"
        />
      </Link>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-1 text-foreground group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
          <div className="text-primary font-bold shrink-0 tabular-nums">
            {formatKWD(listing.price_kwd)}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <span className="truncate">{listing.seller.full_name}</span>
            {listing.seller.is_verified && (
              <TrustBadge
                tier={sellerTier}
                score={sellerScore}
                company={listing.seller.company}
                ratingAvg={listing.seller.rating_avg}
                ratingCount={listing.seller.rating_count}
                size="xs"
              />
            )}
          </div>
          <span className="tabular-nums">{formatRelative(listing.created_at)}</span>
        </div>

        {listing.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {listing.location}
          </div>
        )}
      </div>
    </motion.article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-4 space-y-2.5">
        <div className="flex justify-between gap-2">
          <div className="h-4 w-3/5 shimmer rounded-md" />
          <div className="h-4 w-14 shimmer rounded-md" />
        </div>
        <div className="h-3 w-2/5 shimmer rounded-md" />
        <div className="h-3 w-1/4 shimmer rounded-md" />
      </div>
    </div>
  );
}

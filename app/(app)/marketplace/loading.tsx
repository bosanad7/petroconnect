import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeleton } from "@/components/marketplace/listing-card";

export default function Loading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-3 w-72 rounded-md" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

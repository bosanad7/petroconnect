import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeleton } from "@/components/marketplace/listing-card";

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-3 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-72 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6 animate-fade-in">
      <aside className="space-y-4">
        <Skeleton className="h-7 w-32 rounded-lg" />
        <div className="rounded-2xl glass overflow-hidden divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 flex gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/3 rounded-md" />
                <Skeleton className="h-3 w-5/6 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div className="hidden lg:block">
        <Skeleton className="h-[420px] rounded-3xl" />
      </div>
    </div>
  );
}

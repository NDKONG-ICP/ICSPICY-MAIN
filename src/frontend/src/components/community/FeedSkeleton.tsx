import { Skeleton } from "@/components/ui/skeleton";

export function FeedSkeleton({ rows = 3 }: { rows?: number }) {
  const items = Array.from({ length: rows }, (_, i) => i);
  return (
    <div className="space-y-4" data-ocid="community-feed-skeleton">
      {items.map((i) => (
        <div
          key={`sk-${i}`}
          className="rounded-2xl bg-card border border-border p-4 sm:p-5 space-y-3 shadow-subtle"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-3.5 w-32 max-w-[50%]" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="w-14 h-6 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[70%]" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="flex gap-5 pt-2 border-t border-border/60">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-12 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

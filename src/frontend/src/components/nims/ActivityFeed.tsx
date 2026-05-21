import { Activity } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ActivityEntry } from "../../declarations/backend.did";

function formatTs(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

export type ActivityFeedProps = {
  entries: ActivityEntry[];
  emptyLabel?: string;
  className?: string;
};

export function ActivityFeed({
  entries,
  emptyLabel = "No recent greenhouse activity logged yet.",
  className,
}: ActivityFeedProps) {
  return (
    <div
      data-ocid="nims-activity-feed"
      className={cn(
        "rounded-xl border border-border bg-card divide-y divide-border",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Activity className="size-4" aria-hidden />
        Nursery activity
      </div>
      {entries.length === 0 ? (
        <p data-ocid="nims-activity-feed-empty" className="px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        entries.map((e, idx) => (
          <article
            key={`${e.plantId.toString()}-${e.timestamp}-${idx}`}
            data-ocid={`nims-activity-entry-${idx}`}
            className="gap-3 px-4 py-3 text-sm hover:bg-accent/10"
          >
            <div className="flex items-baseline justify-between gap-3">
              <time
                className="font-mono text-[11px] text-muted-foreground"
                dateTime={new Date(Number(e.timestamp / 1_000_000n)).toISOString()}
              >
                {formatTs(e.timestamp)}
              </time>
              <span className="truncate text-[11px] font-medium uppercase text-primary">
                {e.actionType}
              </span>
            </div>
            <p className="truncate font-medium text-foreground">{e.plantName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>
          </article>
        ))
      )}
    </div>
  );
}

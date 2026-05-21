import { Droplets, FlaskConical, Leaf, Skull, Sprout } from "lucide-react";
import type { PlantLifecycle } from "../../declarations/backend.did";
import { cn } from "@/lib/utils";

function fmtTs(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type TimelineEvent = {
  id: string;
  ts: bigint;
  label: string;
  detail?: string;
  icon: typeof Leaf;
  tone?: "default" | "success" | "warn" | "danger";
};

function buildEvents(lc: PlantLifecycle): TimelineEvent[] {
  const p = lc.plant;
  const events: TimelineEvent[] = [
    {
      id: "planted",
      ts: p.planting_date,
      label: "Seed planted",
      detail: p.variety,
      icon: Sprout,
      tone: "default",
    },
  ];
  if (p.germination_date.length > 0) {
    events.push({
      id: "germinated",
      ts: p.germination_date[0]!,
      label: "Germinated",
      detail: lc.nftTokenId.length > 0 ? `NFT #${lc.nftTokenId[0]!.toString()}` : undefined,
      icon: Leaf,
      tone: "success",
    });
  }
  if (p.transplant_date.length > 0) {
    events.push({
      id: "transplanted",
      ts: p.transplant_date[0]!,
      label: "Transplanted",
      icon: Sprout,
      tone: "success",
    });
  }
  if (lc.soldAt.length > 0) {
    events.push({
      id: "sold",
      ts: lc.soldAt[0]!,
      label: "Sold",
      icon: Leaf,
      tone: "default",
    });
  }
  if (p.is_cooked) {
    events.push({
      id: "dead",
      ts: p.planting_date,
      label: "Marked dead",
      icon: Skull,
      tone: "danger",
    });
  }
  for (const w of lc.wateringLog) {
    events.push({
      id: `water-${w.timestamp.toString()}`,
      ts: w.timestamp,
      label: "Watered",
      detail: `${w.amountMl.toString()} ml`,
      icon: Droplets,
    });
  }
  for (const f of lc.feedingLog) {
    events.push({
      id: `feed-${f.id.toString()}`,
      ts: f.date,
      label: "Fed",
      detail: f.product_name,
      icon: FlaskConical,
    });
  }
  return events.sort((a, b) => Number(b.ts - a.ts));
}

export function PlantTimeline({ lifecycle }: { lifecycle: PlantLifecycle }) {
  const events = buildEvents(lifecycle);

  return (
    <div data-ocid="nims-plant-timeline" className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" aria-hidden />
      <ul className="space-y-4">
        {events.map((ev) => {
          const Icon = ev.icon;
          return (
            <li key={ev.id} className="relative flex gap-3">
              <span
                className={cn(
                  "absolute -left-6 flex size-8 items-center justify-center rounded-full border border-border bg-card",
                  ev.tone === "success" && "border-emerald-500/50 text-emerald-400",
                  ev.tone === "danger" && "border-red-500/50 text-red-400",
                  ev.tone === "warn" && "border-amber-500/50 text-amber-400",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-sm font-medium text-foreground">{ev.label}</p>
                {ev.detail && (
                  <p className="text-xs text-muted-foreground truncate">{ev.detail}</p>
                )}
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  {fmtTs(ev.ts)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

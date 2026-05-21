import { Droplet, Leaf } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlantLifecycle } from "../../declarations/backend.did";

export type PlantCardModel = Pick<
  PlantLifecycle["plant"],
  "variety" | "container_size"
> & {
  nftTokenId?: bigint;
  /** e.g. "Good · watered 2d ago" — usually derived from PlantHealth */
  healthSummary: string;
  healthAccent?: "ok" | "warn" | "bad";
  lastActivityText: string;
};

function pickHealthClass(accent?: PlantCardModel["healthAccent"]): string {
  if (accent === "warn") return "text-amber-400";
  if (accent === "bad") return "text-red-400";
  return "text-emerald-400";
}

function containerHumansize(
  c: PlantCardModel["container_size"],
): string | undefined {
  if (!c || !c.length) return undefined;
  const tag = Object.keys(c[0]!)[0];
  const map: Record<string, string> = {
    Gal1: "1 gal",
    Gal3: "3 gal",
    Gal5: "5 gal",
    Gal10GrowBag: "10 gal bag",
    Gal15GrowBag: "15 gal bag",
    Oz16: "16 oz",
    Pot4Inch: "4″ pot",
    Pot6Inch: "6″ pot",
    Cell72: "72-cell tray",
    InGround: "In ground",
  };
  return map[tag ?? ""] ?? tag;
}

export type PlantInventoryCardProps = {
  plant: PlantCardModel;
  onClick?: () => void;
};

export function lifecycleToCardModel(lc: PlantLifecycle): PlantCardModel {
  const p = lc.plant;
  const nft = lc.nftTokenId?.[0];

  const lastWaterTs = lc.wateringLog.at(-1)?.timestamp;
  const msSinceWater = lastWaterTs
    ? Date.now() - Number(lastWaterTs / 1_000_000n)
    : null;
  const daysSinceWater =
    msSinceWater !== null ? Math.floor(msSinceWater / 86_400_000) : null;

  let healthAccent: PlantCardModel["healthAccent"] = "ok";
  let healthSummary = "On track";
  if (!lastWaterTs) {
    healthSummary = "Not watered yet in NIMS log";
    healthAccent = "warn";
  } else if (
    typeof daysSinceWater === "number" &&
    daysSinceWater !== null &&
    daysSinceWater >= 7
  ) {
    healthSummary = `Dry window · last water ${daysSinceWater}d ago`;
    healthAccent = "warn";
  } else {
    healthSummary = `Last water ${relativeFromIcTs(lastWaterTs)}`;
  }

  let lastActivityText = "No recent nursery events logged";
  const lastWater = lc.wateringLog.at(-1);
  const lastFeed = lc.feedingLog.at(-1);
  const lastPest = lc.pestLog.at(-1);
  const cand: Array<{ ts: bigint; text: string }> = [];
  if (lastWater)
    cand.push({
      ts: lastWater.timestamp,
      text: `Water · ${relativeFromIcTs(lastWater.timestamp)}`,
    });
  if (lastFeed)
    cand.push({
      ts: lastFeed.date,
      text: `${lastFeed.product_name} · fed ${relativeFromIcTs(lastFeed.date)}`,
    });
  if (lastPest)
    cand.push({
      ts: lastPest.timestamp,
      text: `Pest (${lastPest.pestName}) · ${relativeFromIcTs(lastPest.timestamp)}`,
    });
  if (cand.length > 0) {
    cand.sort((a, b) => Number(b.ts - a.ts));
    lastActivityText = cand[0]!.text;
  }

  return {
    variety: p.variety,
    container_size: p.container_size ?? [],
    nftTokenId: nft,
    healthSummary,
    healthAccent,
    lastActivityText,
  };
}

function relativeFromIcTs(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  const diff = Date.now() - ms;
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

/** Inventory card wired to canonical Motoko lifecycle (optional shortcut). */
export function PlantLifecycleCard({
  lifecycle,
  onClick,
}: {
  lifecycle: PlantLifecycle;
  onClick?: () => void;
}) {
  return (
    <PlantCard plant={lifecycleToCardModel(lifecycle)} onClick={onClick} />
  );
}

export function PlantCard({ plant, onClick }: PlantInventoryCardProps) {
  const container = containerHumansize(plant.container_size);
  const className = cn(
    "w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:bg-accent/20",
    onClick && "cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
          <Leaf className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-semibold text-foreground">{plant.variety}</p>
          {container !== undefined && (
            <p className="text-xs text-muted-foreground">{container}</p>
          )}
          {plant.nftTokenId !== undefined && (
            <p className="text-xs text-muted-foreground">
              IC SPICY #{plant.nftTokenId.toString()}
            </p>
          )}
        </div>
      </div>

      <p
        className={cn(
          "mt-3 flex items-center gap-2 text-xs font-medium",
          pickHealthClass(plant.healthAccent),
        )}
        data-ocid="nims-plant-card-health"
      >
        <Droplet className="size-3.5 shrink-0" aria-hidden />
        {plant.healthSummary}
      </p>
      <p
        data-ocid="nims-plant-card-activity"
        className="mt-1 text-xs text-muted-foreground"
      >
        {plant.lastActivityText}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" data-ocid="nims-plant-card" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <div data-ocid="nims-plant-card" className={className}>
      {content}
    </div>
  );
}

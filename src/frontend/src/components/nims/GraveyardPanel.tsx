import { Link } from "@tanstack/react-router";
import { Skull } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getNftImageUrl } from "@/lib/nft-config";
import {
  findDeathRecord,
  formatDeathCause,
} from "@/lib/plant-lifecycle-utils";
import type { PlantLifecycle } from "@/declarations/backend.did";

function memorialDate(lc: PlantLifecycle): string {
  const dr = lc.deathRecord?.[0];
  if (dr?.died_at != null) {
    return new Date(Number(dr.died_at / 1_000_000n)).toLocaleDateString();
  }
  const note = findDeathRecord(lc.notes);
  if (note) {
    return new Date(Number(note.timestamp / 1_000_000n)).toLocaleDateString();
  }
  return "—";
}

function memorialCause(lc: PlantLifecycle): string {
  const dr = lc.deathRecord?.[0];
  if (dr) {
    return formatDeathCause(dr.cause) + (dr.notes?.[0] ? ` — ${dr.notes[0]}` : "");
  }
  return findDeathRecord(lc.notes)?.cause ?? "Unknown";
}

export type GraveyardPanelProps = {
  plants: PlantLifecycle[];
  isLoading: boolean;
};

export function GraveyardPanel({ plants, isLoading }: GraveyardPanelProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (plants.length === 0) {
    return (
      <div
        data-ocid="nims-graveyard-empty"
        className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-center"
      >
        <Skull className="mx-auto mb-2 size-8 text-muted-foreground/60" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No plants in the graveyard yet. When a plant dies, its full record and
          PepperHead memorial stay here forever.
        </p>
      </div>
    );
  }

  return (
    <ul
      data-ocid="nims-graveyard-list"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {plants.map((lc) => {
        const tokenId = lc.nftTokenId?.[0];
        const img =
          tokenId != null && tokenId > 0n
            ? getNftImageUrl(tokenId)
            : undefined;
        return (
          <li key={lc.plant.id.toString()}>
            <Link
              to="/plants/$plantId"
              params={{ plantId: lc.plant.id.toString() }}
              className="flex gap-3 rounded-xl border border-red-900/40 bg-red-950/20 p-3 transition hover:border-red-700/50 hover:bg-red-950/35"
              data-ocid={`nims-graveyard-card-${lc.plant.id.toString()}`}
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                {img ? (
                  <img
                    src={img}
                    alt=""
                    className="size-full object-cover opacity-80 grayscale-[30%]"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-2xl opacity-50">
                    ☠️
                  </div>
                )}
                {tokenId != null && tokenId > 0n && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 text-center text-[9px] text-zinc-300">
                    #{tokenId.toString()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {lc.plant.variety}
                </p>
                <p className="text-[11px] text-red-300/90">Memorial · {memorialDate(lc)}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {memorialCause(lc)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

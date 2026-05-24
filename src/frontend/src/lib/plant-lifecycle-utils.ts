import type { PlantLifecycle } from "../declarations/backend.did";

export type DeathRecord = {
  timestamp: bigint;
  text: string;
  cause: string;
};

const DEATH_PREFIX = "Marked dead:";

/** Explicit nursery death log from `markCellDead` — not the same as `is_cooked` (harvested). */
export function findDeathRecord(
  notes: PlantLifecycle["notes"],
): DeathRecord | null {
  for (const note of notes) {
    if (!note.text.startsWith(DEATH_PREFIX)) continue;
    const rest = note.text.slice(DEATH_PREFIX.length).trim();
    const cause = rest.split(" — ")[0]?.trim() ?? rest;
    return { timestamp: note.timestamp, text: note.text, cause };
  }
  return null;
}

export function hasDeathRecord(lifecycle: PlantLifecycle): boolean {
  return findDeathRecord(lifecycle.notes) !== null;
}

/** True when plant should show revive (death note or cooked/dead flag). */
export function isPlantMarkedDead(lifecycle: PlantLifecycle): boolean {
  return hasDeathRecord(lifecycle) || lifecycle.plant.is_cooked;
}

/** NFT was likely returned to pool when germinated plant has no token after death. */
export function nftLikelyLostOnDeath(lifecycle: PlantLifecycle): boolean {
  const p = lifecycle.plant;
  const germinated =
    p.germination_date != null && p.germination_date.length > 0;
  const hasNft =
    lifecycle.nftTokenId != null && lifecycle.nftTokenId.length > 0;
  return germinated && !hasNft && !p.sold;
}

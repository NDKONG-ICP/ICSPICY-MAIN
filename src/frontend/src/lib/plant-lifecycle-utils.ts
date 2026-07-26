import type { PlantLifecycle, PlantDeathRecord, DeathCause } from "../declarations/backend.did";

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

/** Map backend DeathCause variant to display label. */
export function formatDeathCause(cause: DeathCause): string {
  if ("DampingOff" in cause) return "Damping off";
  if ("PestDamage" in cause) return "Pest damage";
  if ("Drought" in cause) return "Drought";
  if ("Disease" in cause) return "Disease";
  if ("Overwatering" in cause) return "Overwatering";
  if ("Other" in cause) return "Other";
  return "Unknown";
}

export function deathRecordFromLifecycle(
  lifecycle: PlantLifecycle,
): DeathRecord | null {
  const dr = lifecycle.deathRecord?.[0];
  if (dr) {
    const causeText = formatDeathCause(dr.cause);
    const noteText = dr.notes?.[0];
    return {
      timestamp: dr.died_at,
      text: `Marked dead: ${causeText}${noteText ? ` — ${noteText}` : ""}`,
      cause: noteText ? `${causeText} — ${noteText}` : causeText,
    };
  }
  return findDeathRecord(lifecycle.notes);
}

export function hasDeathRecord(lifecycle: PlantLifecycle): boolean {
  return (
    lifecycle.deathRecord != null && lifecycle.deathRecord.length > 0
  ) || findDeathRecord(lifecycle.notes) !== null;
}

/** True when plant should show revive (death note or cooked/dead flag). */
export function isPlantMarkedDead(lifecycle: PlantLifecycle): boolean {
  return lifecycle.plant.is_cooked || hasDeathRecord(lifecycle);
}

/** Legacy deaths cleared nft_id; Phase 2 graveyard keeps the token bound. */
export function nftLikelyLostOnDeath(lifecycle: PlantLifecycle): boolean {
  if (lifecycle.deathRecord?.[0] != null) return false;
  const p = lifecycle.plant;
  const germinated =
    p.germination_date != null && p.germination_date.length > 0;
  const hasNft =
    lifecycle.nftTokenId != null && lifecycle.nftTokenId.length > 0;
  return germinated && !hasNft && !p.sold;
}

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

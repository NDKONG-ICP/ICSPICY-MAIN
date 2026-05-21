import type { ActorSubclass } from "@dfinity/agent";
import type { CreatePlantingEventInput, _SERVICE } from "../declarations/backend.did";

const DAY_NS = 86_400_000_000_000n;

function addDays(fromNs: bigint, days: number): bigint {
  return fromNs + BigInt(days) * DAY_NS;
}

export interface GerminationScheduleInput {
  plantName: string;
  germinationDateNs: bigint;
  /** Days from germination to transplant — default 14 */
  daysToTransplant?: number;
  /** Days from germination to first feed — default 14 */
  daysToFirstFeed?: number;
  /** Days from germination to harvest window — default 90 */
  daysToHarvest?: number;
}

/** Create transplant, feed, and harvest schedule events after NIMS germination. */
export async function createGerminationScheduleEvents(
  svc: ActorSubclass<_SERVICE>,
  input: GerminationScheduleInput,
): Promise<void> {
  const name = input.plantName.trim();
  if (!name) return;

  const transplantDays = input.daysToTransplant ?? 14;
  const feedDays = input.daysToFirstFeed ?? 14;
  const harvestDays = input.daysToHarvest ?? 90;

  const events: CreatePlantingEventInput[] = [
    {
      name,
      emoji: "🪴",
      event_type: { transplantOutdoors: null },
      scheduled_at: addDays(input.germinationDateNs, transplantDays),
      notes: "Auto-scheduled from NIMS germination — transplant window",
    },
    {
      name,
      emoji: "🧪",
      event_type: { harvest: null },
      scheduled_at: addDays(input.germinationDateNs, feedDays),
      notes: "Auto-scheduled — first KNF feeding (2 weeks after germination)",
    },
    {
      name,
      emoji: "🌶️",
      event_type: { harvest: null },
      scheduled_at: addDays(input.germinationDateNs, harvestDays),
      notes: "Auto-scheduled — expected harvest window start",
    },
  ];

  for (const ev of events) {
    await svc.createPlantingEvent(ev);
  }
}

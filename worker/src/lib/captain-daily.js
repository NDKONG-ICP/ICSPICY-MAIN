import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH =
  process.env.CAPTAIN_DAILY_STATE?.trim() ||
  join(__dirname, "../../data/captain-daily.json");

export const STANDALONE_SLOTS_PER_DAY = 3;
export const SLOT_LABELS = ["morning", "midday", "evening"];

/** ET local hours — worker fires once per window (see etScheduleTriggerDue). */
export const ET_SCHEDULE = [
  { label: "morning", startHour: 8 },
  { label: "midday", startHour: 13 },
  { label: "evening", startHour: 19 },
];

/** Hours after startHour still eligible if worker was briefly down. */
export const ET_SCHEDULE_WINDOW_HOURS = 4;

export function easternDateKey(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function readState() {
  try {
    if (!existsSync(STATE_PATH)) return { days: {} };
    const raw = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    if (raw.days && typeof raw.days === "object") return raw;
    // migrate legacy single-flag format
    const days = {};
    if (raw.lastStandaloneDayET) {
      days[raw.lastStandaloneDayET] = {
        slotsPosted: 1,
        lastAt: raw.lastStandaloneAt ?? null,
      };
    }
    return { days };
  } catch {
    return { days: {} };
  }
}

function writeState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function dayRecord(state, key) {
  if (!state.days[key]) {
    state.days[key] = { slotsPosted: 0, slots: [], triggers: {} };
  }
  if (!state.days[key].triggers) state.days[key].triggers = {};
  return state.days[key];
}

export function easternHour(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value;
  return Number(h ?? 0);
}

/**
 * Returns schedule label (morning|midday|evening) if we should fire standalone
 * publish now, or null.
 */
export function etScheduleTriggerDue(now = new Date()) {
  if (standaloneSlotsRemainingTodayET() <= 0) return null;
  const key = easternDateKey(now);
  const hour = easternHour(now);
  const state = readState();
  const rec = dayRecord(state, key);
  for (const slot of ET_SCHEDULE) {
    if (rec.triggers[slot.label]) continue;
    const end = slot.startHour + ET_SCHEDULE_WINDOW_HOURS;
    if (hour >= slot.startHour && hour < end) {
      return slot.label;
    }
  }
  return null;
}

export function markEtScheduleTriggerFired(label) {
  const key = easternDateKey();
  const state = readState();
  const rec = dayRecord(state, key);
  rec.triggers[label] = new Date().toISOString();
  writeState(state);
}

/** @deprecated use standaloneSlotsRemainingTodayET */
export function postedStandaloneTodayET() {
  return standaloneSlotsRemainingTodayET() === 0;
}

export function standaloneSlotsRemainingTodayET() {
  const key = easternDateKey();
  const state = readState();
  const rec = state.days[key];
  const posted = rec?.slotsPosted ?? 0;
  return Math.max(0, STANDALONE_SLOTS_PER_DAY - posted);
}

export function nextStandaloneSlotIndexET() {
  const key = easternDateKey();
  const state = readState();
  const rec = dayRecord(state, key);
  return rec.slotsPosted;
}

export function markStandalonePostedTodayET(meta = {}) {
  const key = easternDateKey();
  const state = readState();
  const rec = dayRecord(state, key);
  const slotIndex = rec.slotsPosted;
  rec.slotsPosted = Math.min(STANDALONE_SLOTS_PER_DAY, rec.slotsPosted + 1);
  rec.lastAt = new Date().toISOString();
  rec.slots = rec.slots ?? [];
  rec.slots.push({
    slot: slotIndex,
    label: SLOT_LABELS[slotIndex] ?? `slot${slotIndex}`,
    at: rec.lastAt,
    ...meta,
  });
  writeState(state);
  return slotIndex;
}

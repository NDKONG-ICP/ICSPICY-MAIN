/**
 * Match variety names mentioned in SpicyAI responses for guide-link chips.
 * Longest-match-first, case-insensitive.
 */
export type VarietyMatch = { id: bigint; name: string };

export function matchVarietiesInText(
  text: string,
  varieties: Array<{ id: bigint; name: string }>,
): VarietyMatch[] {
  if (!text.trim() || varieties.length === 0) return [];
  const lower = text.toLowerCase();
  const sorted = [...varieties].sort((a, b) => b.name.length - a.name.length);
  const seen = new Set<string>();
  const results: VarietyMatch[] = [];

  for (const v of sorted) {
    const name = v.name.trim();
    if (name.length < 4) continue;
    if (!lower.includes(name.toLowerCase())) continue;
    const key = v.id.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ id: v.id, name: v.name });
    if (results.length >= 3) break;
  }
  return results;
}

export const SPICYAI_SUGGESTED_PROMPTS = [
  "Tell me about the Pink Wendigo",
  "What's the difference between a Reaper and a 7 Pot Primo?",
  "How hot is a Sugar Rush Peach?",
  "What should I feed my Ghost Pepper during flowering?",
  "How do I track plants in NIMS?",
] as const;

/** Rotate a subset of suggested prompts for the empty-state UI. */
export function pickSuggestedPrompts(count = 3): string[] {
  const pool = [...SPICYAI_SUGGESTED_PROMPTS];
  const out: string[] = [];
  while (out.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}

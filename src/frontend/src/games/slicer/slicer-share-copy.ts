/**
 * Slicer share card copy — mirrors backend lib/slicer-share-html.mo taunts.
 */
import { SITE_ORIGIN } from "@/lib/seo-routes.mjs";
import { scoreToTier, type BatchTier } from "./constants";

export type SlicerTierSlug = "mild" | "craft" | "reserve" | "legendary";

export function tierToSlug(tier: BatchTier): SlicerTierSlug {
  switch (tier) {
    case "Mild Batch":
      return "mild";
    case "Craft Batch":
      return "craft";
    case "Reserve Batch":
      return "reserve";
    case "Legendary Small Batch":
      return "legendary";
  }
}

export function scoreToTierSlug(score: number): SlicerTierSlug {
  return tierToSlug(scoreToTier(score));
}

export function formatShareScore(score: number): string {
  return score.toLocaleString("en-US");
}

export function tauntForTier(tier: SlicerTierSlug, score: number): string {
  const s = formatShareScore(score);
  switch (tier) {
    case "mild":
      return `Step right up — ${s} SHU and climbing. Bet you can't beat it.`;
    case "craft":
      return `${s} SHU — Craft Batch certified. Replay-validated on the Internet Computer. Screenshots don't count here.`;
    case "reserve":
      return `${s} SHU Reserve Batch. The chain remembers — do you?`;
    case "legendary":
      return `${s} SHU LEGENDARY. Verified on-chain. No screenshots. No excuses. Just heat.`;
  }
}

export function ogTitle(username: string, score: number): string {
  return `@${username} scored ${formatShareScore(score)} SHU in ICSPICY Slicer 🔥`;
}

export function sharePrefillText(score: number, url: string): string {
  return `I scored ${formatShareScore(score)} SHU in ICSPICY Slicer 🌶️ Bet you can't beat it. ${url}`;
}

export function tierOgImage(tier: SlicerTierSlug): string {
  return `${SITE_ORIGIN}/og/slicer/${tier}.png`;
}

export function slicerSharePath(principal: string): string {
  return `/s/slicer/${principal}`;
}

export function slicerShareUrl(
  principal: string,
  lastPlayedNs: bigint | number,
): string {
  const v = typeof lastPlayedNs === "bigint" ? lastPlayedNs.toString() : String(lastPlayedNs);
  return `${SITE_ORIGIN}${slicerSharePath(principal)}?v=${v}`;
}

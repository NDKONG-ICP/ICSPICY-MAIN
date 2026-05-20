/** NFT holder discount math — mirrors backend lib/nft-discount.mo (number cents in cart). */

import { priceCentsToNumber } from "./cart-utils";

export function discountAmountCents(
  subtotalCents: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0 || subtotalCents <= 0) return 0;
  return Math.round((subtotalCents * discountPercent) / 100);
}

export function discountedSubtotalCents(
  subtotalCents: number,
  discountPercent: number,
): number {
  return subtotalCents - discountAmountCents(subtotalCents, discountPercent);
}

export function discountedUnitPriceCents(
  unitPriceCents: bigint | number,
  discountPercent: number,
): number {
  return discountedSubtotalCents(
    priceCentsToNumber(unitPriceCents),
    discountPercent,
  );
}

export function formatRarityLabel(rarity: string): string {
  switch (rarity) {
    case "common":
      return "Common";
    case "uncommon":
      return "Uncommon";
    case "rare":
      return "Rare";
    case "rare_pepperhead":
      return "Rare PepperHead";
    case "founder_pepperhead":
      return "Founder PepperHead";
    default:
      return "";
  }
}

export function formatDiscountedPriceDisplay(
  unitPriceCents: bigint | number,
  discountPercent: number,
): { yourPrice: string; listPrice: string } {
  const list = priceCentsToNumber(unitPriceCents) / 100;
  const your = discountedUnitPriceCents(unitPriceCents, discountPercent) / 100;
  return {
    yourPrice: `$${your.toFixed(2)}`,
    listPrice: `$${list.toFixed(2)}`,
  };
}

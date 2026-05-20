/** NFT holder discount math — mirrors backend lib/nft-discount.mo. */

export function discountAmountCents(
  subtotalCents: bigint,
  discountPercent: number,
): bigint {
  if (discountPercent <= 0 || subtotalCents <= 0n) return 0n;
  return (subtotalCents * BigInt(discountPercent) + 50n) / 100n;
}

export function discountedSubtotalCents(
  subtotalCents: bigint,
  discountPercent: number,
): bigint {
  const discount = discountAmountCents(subtotalCents, discountPercent);
  return subtotalCents - discount;
}

export function discountedUnitPriceCents(
  unitPriceCents: bigint,
  discountPercent: number,
): bigint {
  return discountedSubtotalCents(unitPriceCents, discountPercent);
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
  unitPriceCents: bigint,
  discountPercent: number,
): { yourPrice: string; listPrice: string } {
  const list = Number(unitPriceCents) / 100;
  const your = Number(discountedUnitPriceCents(unitPriceCents, discountPercent)) / 100;
  return {
    yourPrice: `$${your.toFixed(2)}`,
    listPrice: `$${list.toFixed(2)}`,
  };
}

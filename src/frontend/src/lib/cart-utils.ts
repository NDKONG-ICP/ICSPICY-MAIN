/** USPS Small Flat Rate Box — hardcoded until carrier API integration. */
export const USPS_SMALL_FLAT_RATE_CENTS = 1020n;

export const FRESH_PODS_LB_CENTS = 1299n;
export const FRESH_PODS_FLAT_BOX_CENTS = 2599n;

export const PICKUP_ADDRESS =
  "IC SPICY Nursery · Port Charlotte, FL · Local pickup";

export function lineIdForProduct(productId: bigint, plantId?: bigint): string {
  if (plantId !== undefined) return `plant-${plantId.toString()}`;
  return `product-${productId.toString()}`;
}

export function lineTotalCents(
  unitPriceCents: bigint,
  quantity: number,
): bigint {
  return unitPriceCents * BigInt(quantity);
}

export function cartHasShippable(
  items: Array<{ shippable?: boolean }>,
): boolean {
  return items.some((i) => i.shippable === true);
}

export function formatLinePrice(
  unitPriceCents: bigint,
  quantity: number,
  weightBased?: boolean,
  unitLabel?: string,
): string {
  const total = lineTotalCents(unitPriceCents, quantity);
  const base = `$${(Number(total) / 100).toFixed(2)}`;
  if (weightBased && unitLabel) {
    return `${base} (${quantity} ${unitLabel})`;
  }
  return base;
}

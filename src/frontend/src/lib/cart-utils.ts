/** USPS Small Flat Rate Box — hardcoded until carrier API integration. */
export const USPS_SMALL_FLAT_RATE_CENTS = 1020;

export const FRESH_PODS_LB_CENTS = 1299;
export const FRESH_PODS_FLAT_BOX_CENTS = 2599;

export const PICKUP_ADDRESS =
  "IC SPICY Nursery · Port Charlotte, FL · Local pickup";

export function lineIdForProduct(productId: bigint, plantId?: bigint): string {
  if (plantId !== undefined) return `plant-${plantId.toString()}`;
  return `product-${productId.toString()}`;
}

/** Normalize Candid Nat (BigInt) or persisted JSON number/string to cart cents. */
export function priceCentsToNumber(cents: bigint | number | string): number {
  if (typeof cents === "bigint") return Number(cents);
  if (typeof cents === "string") return Number(cents.replace(/n$/, ""));
  return cents;
}

/** Coerce persisted cart / API values to BigInt for Candid nat fields. */
export function toNatBigInt(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") {
    return BigInt(value.endsWith("n") ? value.slice(0, -1) : value);
  }
  throw new Error(`Invalid nat value: ${String(value)}`);
}

export function toOptionalNatBigInt(
  value: bigint | number | string | undefined,
): bigint | undefined {
  if (value === undefined || value === null) return undefined;
  return toNatBigInt(value);
}

export function lineTotalCents(
  unitPriceCents: bigint | number | string,
  quantity: number,
): number {
  return priceCentsToNumber(unitPriceCents) * quantity;
}

export function cartHasShippable(
  items: Array<{ shippable?: boolean }>,
): boolean {
  return items.some((i) => i.shippable === true);
}

export function formatLinePrice(
  unitPriceCents: bigint | number | string,
  quantity: number,
  weightBased?: boolean,
  unitLabel?: string,
): string {
  const total = lineTotalCents(unitPriceCents, quantity);
  const base = `$${(total / 100).toFixed(2)}`;
  if (weightBased && unitLabel) {
    return `${base} (${quantity} ${unitLabel})`;
  }
  return base;
}

export function formatCentsDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

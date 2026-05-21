import type { ContainerSize } from "../declarations/backend.did";

const SIZE_LABELS: Record<string, string> = {
  Oz16: "16 oz cup",
  Gal1: "1 gallon",
  Gal3: "3 gallon",
  Gal5: "5 gallon",
  Gal1New: "1 gallon",
  Gal3New: "3 gallon",
  Gal5Bucket: "5 gallon bucket",
  Gal5GrowBag: "5 gallon grow bag",
  Gal7Pot: "7 gallon pot",
  Gal7GrowBag: "7 gallon grow bag",
  Gal10GrowBag: "10 gallon grow bag",
  Gal15GrowBag: "15 gallon grow bag",
  Pot4Inch: "4″ pot",
  Pot6Inch: "6″ pot",
  Cell72: "72-cell tray",
  Cell128: "128-cell tray",
  InGround: "In ground",
};

const SIZE_RANK: Record<string, number> = {
  Oz16: 1,
  Cell72: 1,
  Cell128: 1,
  Pot4Inch: 2,
  Pot6Inch: 3,
  Gal1: 4,
  Gal1New: 4,
  Gal3: 5,
  Gal3New: 5,
  Gal5: 6,
  Gal5Bucket: 6,
  Gal5GrowBag: 6,
  Gal7Pot: 7,
  Gal7GrowBag: 7,
  Gal10GrowBag: 8,
  Gal15GrowBag: 9,
  InGround: 10,
};

export function containerSizeKey(size: ContainerSize): string {
  return Object.keys(size)[0] ?? "Unknown";
}

export function containerSizeLabel(
  size: ContainerSize | [] | [ContainerSize] | undefined,
): string {
  if (!size) return "Unknown container";
  const value = Array.isArray(size) ? size[0] : size;
  if (!value) return "Unknown container";
  const tag = containerSizeKey(value);
  if (tag === "Other") {
    const other = (value as { Other: string }).Other;
    return other || "Custom container";
  }
  return SIZE_LABELS[tag] ?? tag;
}

export function containerSizeRank(size: ContainerSize): number {
  const tag = containerSizeKey(size);
  if (tag === "Other") return 5;
  return SIZE_RANK[tag] ?? 0;
}

export function isContainerUpgrade(from: ContainerSize, to: ContainerSize): boolean {
  const fromRank = containerSizeRank(from);
  const toRank = containerSizeRank(to);
  return toRank > fromRank || (toRank === fromRank && containerSizeKey(from) !== containerSizeKey(to));
}

export const TRANSPLANT_SIZE_OPTIONS: ReadonlyArray<{
  label: string;
  value: string;
  size: ContainerSize;
}> = [
  { label: "16 oz cup", value: "oz16", size: { Oz16: null } },
  { label: "1 gallon", value: "gal1", size: { Gal1: null } },
  { label: "3 gallon", value: "gal3", size: { Gal3: null } },
  { label: "5 gallon", value: "gal5", size: { Gal5: null } },
  { label: "4″ liner", value: "pot4", size: { Pot4Inch: null } },
  { label: "6″ liner", value: "pot6", size: { Pot6Inch: null } },
  { label: "10 gal grow bag", value: "bag10", size: { Gal10GrowBag: null } },
  { label: "15 gal grow bag", value: "bag15", size: { Gal15GrowBag: null } },
  { label: "In ground bed", value: "ground", size: { InGround: null } },
];

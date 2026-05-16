import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx += 1;
  }
  const decimals = value < 10 && unitIdx > 0 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[unitIdx]}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function pluralize(n: number, singular: string, plural?: string) {
  if (n === 1) return `${n} ${singular}`;
  return `${n} ${plural ?? `${singular}s`}`;
}

export function readingLabel(minutes: number): string {
  if (minutes <= 1) return "1 min read";
  return `${minutes} min read`;
}

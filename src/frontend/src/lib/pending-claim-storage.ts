/** Persist skipped NFT claims for return-visitor homepage banner. */

export type PendingClaimRecord = {
  orderId: string;
  claimTokens: string[];
  nftTokenIds: string[];
  storedAt: number;
};

const STORAGE_KEY = "icspicy-pending-claims";

function readAll(): PendingClaimRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingClaimRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: PendingClaimRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function storePendingClaim(record: Omit<PendingClaimRecord, "storedAt">) {
  const existing = readAll().filter((r) => r.orderId !== record.orderId);
  writeAll([
    ...existing,
    { ...record, storedAt: Date.now() },
  ]);
}

export function getPendingClaims(): PendingClaimRecord[] {
  return readAll();
}

export function clearPendingClaim(orderId: bigint | string) {
  const id = typeof orderId === "bigint" ? orderId.toString() : orderId;
  writeAll(readAll().filter((r) => r.orderId !== id));
}

export function hasPendingClaims(): boolean {
  return readAll().length > 0;
}

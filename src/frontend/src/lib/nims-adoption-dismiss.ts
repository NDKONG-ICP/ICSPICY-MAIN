const DISMISSED_KEY = "nims-adoption-dismissed";

export function getDismissedNfts(): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set();
  try {
    const stored = sessionStorage.getItem(DISMISSED_KEY);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function dismissNft(tokenId: string): void {
  if (typeof sessionStorage === "undefined") return;
  const dismissed = getDismissedNfts();
  dismissed.add(tokenId);
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

export function filterUndismissedNfts(tokenIds: bigint[]): bigint[] {
  const dismissed = getDismissedNfts();
  return tokenIds.filter((id) => !dismissed.has(id.toString()));
}

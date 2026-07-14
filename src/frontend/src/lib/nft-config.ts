// src/lib/nft-config.ts
//
// NFT asset URL resolution and token-id validation for the IC SPICY
// collection.
//
// The asset canister id MUST come from the build environment, never
// hardcoded in component code. dfx auto-sets process.env.CANISTER_ID_<NAME>
// at build time, and vite-plugin-environment (see vite.config.js) forwards
// the CANISTER_* prefix into the bundle. We accept the alternate ordering
// CANISTER_NFT_ASSETS_ID as a fallback for environments that don't run
// through `dfx deploy`.

function getNftAssetsCanisterId(): string {
  const viteEnv = import.meta.env as Record<string, string | undefined>;
  return (
    process.env.CANISTER_ID_NFT_ASSETS ??
    process.env.CANISTER_NFT_ASSETS_ID ??
    viteEnv.VITE_CANISTER_ID_NFT_ASSETS ??
    viteEnv.CANISTER_ID_NFT_ASSETS ??
    "gawk3-2qaaa-aaaao-ba4sa-cai"
  );
}

const DFX_NETWORK = process.env.DFX_NETWORK ?? import.meta.env.DFX_NETWORK;

// Inclusive bounds for the IC SPICY collection. Defined here (not in the
// hooks) so the validator can short-circuit BEFORE any network call —
// invalid ids never hit the actor.
const TOKEN_ID_MIN = 1n;
const TOKEN_ID_MAX = 8888n;
export const ACHIEVEMENT_TOKEN_START = 200_000n;

export function isAchievementTokenId(tokenId: bigint | number): boolean {
  const id = typeof tokenId === "bigint" ? tokenId : BigInt(tokenId);
  return id >= ACHIEVEMENT_TOKEN_START;
}

export function getBadgeImageUrl(badgeType: string): string {
  const canisterId = getNftAssetsCanisterId();
  const file = `${badgeType}.webp`;
  if (DFX_NETWORK === "local") {
    return `http://${canisterId}.localhost:4943/badges/${file}`;
  }
  return `https://${canisterId}.icp0.io/badges/${file}`;
}

export function getBadgeFallbackImageUrl(): string {
  return getBadgeImageUrl("genesis");
}

/** Resolve display image for any ICRC-7 token (collection NFT or achievement badge). */
export function resolveNftImageUrl(
  tokenId: bigint | number,
  badgeType?: string,
): string {
  if (isAchievementTokenId(tokenId)) {
    return badgeType ? getBadgeImageUrl(badgeType) : getBadgeFallbackImageUrl();
  }
  return getNftImageUrl(tokenId);
}

export function getNftImageUrl(tokenId: bigint | number): string {
  const id = typeof tokenId === "bigint" ? tokenId.toString() : String(tokenId);
  const canisterId = getNftAssetsCanisterId();
  if (DFX_NETWORK === "local") {
    return `http://${canisterId}.localhost:4943/images/nft_${id}.png`;
  }
  return `https://${canisterId}.icp0.io/images/nft_${id}.png`;
}

// Returns the parsed bigint id when valid for the NFT detail route:
// collection IDs 1–8888 or soulbound achievement badges ≥ 200_000.
export function parseNftRouteTokenId(raw: string | undefined): bigint | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  let n: bigint;
  try {
    n = BigInt(raw);
  } catch {
    return null;
  }
  if (n >= TOKEN_ID_MIN && n <= TOKEN_ID_MAX) return n;
  if (n >= ACHIEVEMENT_TOKEN_START) return n;
  return null;
}

// Returns the parsed bigint id when valid for the ICRC-7 collection pool only.
export function isValidTokenId(raw: string | undefined): bigint | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  let n: bigint;
  try {
    n = BigInt(raw);
  } catch {
    return null;
  }
  if (n < TOKEN_ID_MIN || n > TOKEN_ID_MAX) return null;
  return n;
}

export const NFT_COLLECTION_SIZE = TOKEN_ID_MAX;

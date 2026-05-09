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

const NFT_ASSETS_CANISTER_ID =
  process.env.CANISTER_ID_NFT_ASSETS ?? process.env.CANISTER_NFT_ASSETS_ID;

const DFX_NETWORK = process.env.DFX_NETWORK;

// Inclusive bounds for the IC SPICY collection. Defined here (not in the
// hooks) so the validator can short-circuit BEFORE any network call —
// invalid ids never hit the actor.
const TOKEN_ID_MIN = 1n;
const TOKEN_ID_MAX = 8888n;

export function getNftImageUrl(tokenId: bigint | number): string {
  const id = typeof tokenId === "bigint" ? tokenId.toString() : String(tokenId);
  if (!NFT_ASSETS_CANISTER_ID) {
    // No env var set at build time. The component's <img onError> handler
    // will swap to a placeholder tile, so we just return a clearly-invalid
    // URL and warn loudly in the console.
    if (typeof console !== "undefined") {
      console.warn(
        "CANISTER_ID_NFT_ASSETS is not set; NFT image URLs will be invalid",
      );
    }
    return `/missing-nft-${id}.png`;
  }
  if (DFX_NETWORK === "local") {
    // Local asset canister gateway: <id>.localhost:4943
    return `http://${NFT_ASSETS_CANISTER_ID}.localhost:4943/images/nft_${id}.png`;
  }
  // Mainnet / staging: HTTPS gateway.
  return `https://${NFT_ASSETS_CANISTER_ID}.icp0.io/images/nft_${id}.png`;
}

// Returns the parsed bigint id when valid, or null when the input is not
// a positive decimal integer in [1, 8888]. Rejects scientific notation,
// floats, hex, leading "+", and signed integers.
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

/** Mainnet backend NFT ledger — override via VITE_CANISTER_ID_BACKEND in build env. */
export function getBackendCanisterId(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (
    env.VITE_CANISTER_ID_BACKEND ??
    env.CANISTER_ID_BACKEND ??
    "ghxmp-xiaaa-aaaao-ba4sq-cai"
  );
}

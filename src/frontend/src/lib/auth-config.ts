/** Internet Identity provider URL (local replica vs mainnet). */
export const II_PROVIDER = import.meta.env.DEV
  ? "http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943"
  : "https://identity.ic0.app";

/** Mainnet frontend derivation origin for Internet Identity. */
export const II_DERIVATION_ORIGIN =
  "https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io";

export const BACKEND_CANISTER_ID = "ghxmp-xiaaa-aaaao-ba4sq-cai";

/** ICP HTTP agent host (matches AuthProvider actor setup). */
export const IC_HOST = import.meta.env.DEV
  ? "http://127.0.0.1:4943"
  : "https://icp-api.io";

import { createHash } from "node:crypto";

/** @returns {Uint8Array} 32-byte subaccount for canister account. */
export function subaccountFromLabel(label) {
  return createHash("sha256").update(String(label), "utf8").digest();
}

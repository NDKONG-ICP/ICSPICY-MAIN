import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import * as bip39 from "bip39";

/**
 * Derive a stable worker identity from BIP39 mnemonic.
 * Uses the standard dfx PEM derivation path pattern.
 */
export async function loadWorkerIdentity(mnemonic) {
  const words = mnemonic.trim().split(/\s+/);
  if (!bip39.validateMnemonic(words.join(" "))) {
    throw new Error("Invalid WORKER_MNEMONIC — must be valid BIP39");
  }
  const seed = await bip39.mnemonicToSeed(words.join(" "));
  const seed32 = seed.subarray(0, 32);
  return Secp256k1KeyIdentity.fromSeed(seed32);
}

export function loadMnemonicFromEnv() {
  const fromEnv = process.env.WORKER_MNEMONIC?.trim();
  if (fromEnv) return fromEnv;
  const path = process.env.WORKER_MNEMONIC_FILE?.trim();
  if (path) {
    return readFileSync(path, "utf8").trim();
  }
  throw new Error("Set WORKER_MNEMONIC or WORKER_MNEMONIC_FILE");
}

export function defaultMnemonicFile() {
  return join(homedir(), ".ic-spicy", "worker-mnemonic.txt");
}

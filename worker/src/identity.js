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
  const phrase = words.join(" ");
  if (!bip39.validateMnemonic(phrase)) {
    throw new Error("Invalid WORKER_MNEMONIC — must be valid BIP39");
  }
  return Secp256k1KeyIdentity.fromSeedPhrase(phrase);
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

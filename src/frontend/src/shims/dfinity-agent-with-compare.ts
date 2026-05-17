/**
 * `@slide-computer/signer-agent@3.20` imports `compare` from `@dfinity/agent`.
 * It was removed from the public `@dfinity/agent` entry; this module restores it.
 *
 * Import the real implementation by file path so Vite's `@dfinity/agent` alias
 * (see vite.config.js) does not recurse into this shim.
 */
export * from "../../node_modules/@dfinity/agent/lib/esm/index.js";
export { LookupPathStatus as LookupStatus } from "../../node_modules/@dfinity/agent/lib/esm/certificate.js";

/** @deprecated in agent-js; kept for IdentityKit / slide-computer Stoic transport */
export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** @deprecated in agent-js; kept for IdentityKit / slide-computer Stoic transport */
export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "").trim();
  if (clean.length % 2 !== 0) {
    throw new RangeError("fromHex: odd-length string");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function compare(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a[i]! - b[i]!;
    if (d !== 0) return d;
  }
  return a.length - b.length;
}

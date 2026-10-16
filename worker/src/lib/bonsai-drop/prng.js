import { createHash, createHmac } from "node:crypto";

/** @param {Buffer} seed 32 bytes */
export function seedHashHex(seed) {
  return createHash("sha256").update(seed).digest("hex");
}

/**
 * Deterministic bytes stream from seed (HMAC-DRBG style).
 * @param {Buffer} seed
 */
function* byteStream(seed) {
  let counter = 0;
  for (;;) {
    const block = createHmac("sha256", seed)
      .update(Buffer.from([counter >> 24, counter >> 16, counter >> 8, counter]))
      .digest();
    counter += 1;
    for (const b of block) yield b;
  }
}

/**
 * Fisher–Yates shuffle (in-place copy) using seeded stream.
 * @param {number[]} arr
 * @param {Buffer} seed
 */
export function seededShuffle(arr, seed) {
  const out = arr.slice();
  const stream = byteStream(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const b0 = stream.next().value;
    const b1 = stream.next().value;
    const b2 = stream.next().value;
    const b3 = stream.next().value;
    const r = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
    const j = r % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

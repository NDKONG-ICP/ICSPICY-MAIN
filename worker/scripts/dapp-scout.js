#!/usr/bin/env node
/**
 * Weekly dapp scout — writes research/dapp-scout-report.md (curated; no auto-register).
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "research", "dapp-scout-report.md");

const SEED = [
  "ICPixel layered NFT art on ICP",
  "Dvinity Lottery ICP",
  "Ruggy Riches ICP",
  "Wild Tigers Hedera staking PAWS",
  "SentX Hedera marketplace",
  "Canopy Bonsai wallet",
];

async function main() {
  const lines = [
    "# Dapp scout report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Proposed additions (approve in admin UI before Captain spends)",
    "",
    ...SEED.map((s) => `- ${s} — status: **proposed**`),
    "",
    "## Notes",
    "- Captain integrates at canister level; II browser login is not automated.",
    "- Set HTS token IDs on Hedera collections in `data/dapp-registry.json` after research.",
    "",
  ];
  writeFileSync(OUT, lines.join("\n"));
  console.log(`[dapp-scout] wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

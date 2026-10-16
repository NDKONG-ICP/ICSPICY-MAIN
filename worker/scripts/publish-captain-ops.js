#!/usr/bin/env node
/** Upload spend summary + dapp registry for admin dashboard. */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { uploadPublicJson } from "../src/lib/bonsai-drop/publish-assets.js";
import { buildDeskSnapshot } from "../src/lib/captain-desk.js";
import { probeCaptainVenues } from "../src/lib/captain-venues.js";
import { getSpendSummary } from "../src/lib/spend-ledger.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REG = join(HERE, "..", "data", "dapp-registry.json");

async function main() {
  await probeCaptainVenues();
  await uploadPublicJson("/captain-ops/spend-summary.json", getSpendSummary());
  await uploadPublicJson("/captain-ops/desk.json", buildDeskSnapshot());
  if (existsSync(REG)) {
    await uploadPublicJson(
      "/captain-ops/dapp-registry.json",
      JSON.parse(readFileSync(REG, "utf8")),
    );
  }
  console.log("[publish-captain-ops] done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

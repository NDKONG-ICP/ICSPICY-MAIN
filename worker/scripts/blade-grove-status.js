#!/usr/bin/env node
/** Offline / on-chain Blade Grove status for Capsaicin. */
import { statusSnapshot, playStory } from "../src/clients/blade-grove/index.js";

const args = new Set(process.argv.slice(2));
if (args.has("--play")) {
  const max = Number(
    process.argv[process.argv.indexOf("--play") + 1] || 3,
  );
  const r = playStory({ maxNodes: Number.isFinite(max) ? max : 3 });
  console.log(r.summary);
  console.log(JSON.stringify(r.results, null, 2));
} else {
  console.log(JSON.stringify(statusSnapshot(), null, 2));
}

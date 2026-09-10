// One-off: register Captain Capsaicin on Crumbeatr.
//
//   node scripts/register-crumbeatr.js            # register + avatar
//   node scripts/register-crumbeatr.js --status   # just print profile/balances
//
// Flow (Taggr fork): fund the caller's ICP invoice subaccount on the main
// canister, then create_user() converts it to credits and creates the account.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadCaptainIdentity, loadMnemonicFromEnv } from "../src/identity.js";
import { createCrumbeatrClient } from "../src/clients/crumbeatr.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const USERNAME_CANDIDATES = [
  "CaptainCapsaicin",
  "Captain_Capsaicin",
  "CptCapsaicin",
];
const STATUS_ONLY = process.argv.includes("--status");

async function main() {
  const identity = await loadCaptainIdentity(loadMnemonicFromEnv());
  const client = await createCrumbeatrClient({ identity });
  console.log(`captain principal: ${client.principal.toText()}`);
  console.log(`invoice account:   ${client.invoiceAccountHex()}`);

  const icpBal = await client.icpBalance();
  console.log(`captain ICP: ${Number(icpBal) / 1e8}`);

  const existing = await client.myProfile();
  if (existing) {
    console.log(
      `already registered as @${existing.name} (id ${existing.id}, credits ${existing.cycles ?? existing.credits})`,
    );
  }
  if (STATUS_ONLY) {
    const crumb = await client.crumbBalance();
    console.log(`CRUMB balance (raw): ${crumb}`);
    return;
  }

  if (!existing) {
    // Pick a valid, available username
    let name = null;
    for (const candidate of USERNAME_CANDIDATES) {
      const check = await client.validateUsername(candidate);
      if (check === null || check?.Ok !== undefined || check === "") {
        name = candidate;
        break;
      }
      console.log(`username ${candidate} rejected:`, JSON.stringify(check));
    }
    if (!name) throw new Error("no username candidate accepted");
    console.log(`registering as: ${name}`);

    // Fund the invoice: 1 XDR worth of ICP + 25% margin
    const stats = await client.jsonQuery("stats");
    const e8sPerXdr = BigInt(stats?.e8s_for_one_xdr ?? 40_000_000);
    const needed = (e8sPerXdr * 125n) / 100n;
    console.log(
      `1 XDR = ${Number(e8sPerXdr) / 1e8} ICP; funding invoice with ${Number(needed) / 1e8} ICP`,
    );
    if (icpBal < needed + 10_000n) {
      throw new Error(
        `captain ICP balance too low: has ${icpBal}, needs ${needed + 10_000n}`,
      );
    }
    const block = await client.fundInvoice(needed);
    console.log(`invoice funded at ledger block ${block}`);

    const result = await client.createUser(name, null);
    console.log("create_user:", JSON.stringify(result));
    if (result && result.Err) throw new Error(`create_user: ${result.Err}`);

    const profile = await client.myProfile();
    if (!profile) throw new Error("registration did not stick — check invoice");
    console.log(
      `registered @${profile.name} (id ${profile.id}, credits ${profile.cycles ?? profile.credits})`,
    );
  }

  // Avatar: try sizes largest-first until the canister accepts one
  for (const size of [256, 128, 96]) {
    const path = join(HERE, "..", "assets", `captain-capsaicin-${size}.jpg`);
    try {
      const bytes = readFileSync(path);
      const res = await client.setAvatar(bytes);
      if (res && res.Err) {
        console.log(`set_avatar ${size}px rejected: ${res.Err}`);
        continue;
      }
      console.log(`avatar set (${size}px, ${bytes.length} bytes)`);
      break;
    } catch (err) {
      console.log(`set_avatar ${size}px failed: ${err.message}`);
    }
  }

  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

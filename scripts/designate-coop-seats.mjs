#!/usr/bin/env node
/**
 * designate-coop-seats.mjs — select 88 canister-owned PepperHead seats and designate.
 *
 * Scans token IDs 7891–8726 (excludes 7845–7890 claim-labeled range).
 * Filters: canister-owned, no null owner, PepperHead range.
 * Backend designateCoopSeats additionally skips live claim tokens and already-sold seats.
 *
 * Usage:
 *   node scripts/designate-coop-seats.mjs --network ic [--dry-run] [--execute]
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];
const dryRun = !args.includes("--execute");
const SEAT_COUNT = 88;
const PH_START = 7891;
const PH_END = 8726;
const EXCLUDE_CLAIM_RANGE = { min: 7845, max: 7890 };

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();

const Account = IDL.Record({
  owner: IDL.Principal,
  subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
});

const backendIDL = ({ IDL: I }) =>
  I.Service({
    icrc7_owner_of: I.Func([I.Vec(I.Nat)], [I.Vec(I.Opt(Account))], ["query"]),
    designateCoopSeats: I.Func(
      [I.Vec(I.Nat)],
      [
        I.Record({
          designated: I.Nat,
          skipped: I.Nat,
          messages: I.Vec(I.Text),
        }),
      ],
      [],
    ),
    getCoopSeatsRemaining: I.Func(
      [],
      [I.Record({ total: I.Nat, available: I.Nat })],
      ["query"],
    ),
  });

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log(`designate-coop-seats — ${dryRun ? "DRY RUN" : "EXECUTE"} (${network})`);
  console.log(`Scan range: ${PH_START}–${PH_END} (exclude claim labels ${EXCLUDE_CLAIM_RANGE.min}–${EXCLUDE_CLAIM_RANGE.max})`);

  const identityName = execSync("dfx identity whoami").toString().trim();
  const pem = await fs.readFile(
    path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem"),
    "utf8",
  );
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const backend = Actor.createActor(backendIDL, {
    agent,
    canisterId: BACKEND,
  });

  const tokenIds = [];
  for (let id = PH_START; id <= PH_END; id++) {
    if (id >= EXCLUDE_CLAIM_RANGE.min && id <= EXCLUDE_CLAIM_RANGE.max) continue;
    tokenIds.push(BigInt(id));
  }

  const candidates = [];
  for (const batch of chunk(tokenIds, 50)) {
    const owners = await backend.icrc7_owner_of(batch);
    for (let i = 0; i < batch.length; i++) {
      const acc = owners[i]?.[0];
      if (!acc) continue;
      const owner = acc.owner;
      const hasSub = acc.subaccount != null && acc.subaccount.length > 0;
      if (hasSub) continue;
      const ownerText =
        typeof owner.toText === "function" ? owner.toText() : String(owner);
      if (ownerText !== BACKEND) continue;
      candidates.push(Number(batch[i]));
    }
  }

  candidates.sort((a, b) => a - b);
  const selected = candidates.slice(0, SEAT_COUNT);

  console.log(`\nCanister-owned PepperHeads in range: ${candidates.length}`);
  console.log(`Selected for designation: ${selected.length}`);
  if (selected.length > 0) {
    console.log(`ID range: ${selected[0]} – ${selected[selected.length - 1]}`);
    console.log(`First 10: ${selected.slice(0, 10).join(", ")}`);
    console.log(`Last 10: ${selected.slice(-10).join(", ")}`);
  }

  if (selected.length < SEAT_COUNT) {
    console.warn(`\n⚠ Only ${selected.length}/${SEAT_COUNT} candidates found`);
  }

  if (dryRun) {
    console.log("\nRe-run with --execute to call designateCoopSeats.");
    return;
  }

  const result = await backend.designateCoopSeats(selected.map((n) => BigInt(n)));
  console.log(`\nBackend designateCoopSeats:`);
  console.log(`  designated: ${result.designated}`);
  console.log(`  skipped: ${result.skipped}`);
  if (result.messages?.length) {
    for (const m of result.messages.slice(0, 20)) console.log(`  - ${m}`);
    if (result.messages.length > 20) {
      console.log(`  … and ${result.messages.length - 20} more`);
    }
  }

  const stats = await backend.getCoopSeatsRemaining();
  console.log(`\ngetCoopSeatsRemaining: ${stats.available} of ${stats.total} available`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

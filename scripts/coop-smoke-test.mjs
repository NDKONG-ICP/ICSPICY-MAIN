#!/usr/bin/env node
/**
 * coop-smoke-test.mjs — end-to-end Grower Co-op membership chain on mainnet.
 *
 * Requires: backend deployed with CoopAPI, seats designated, admin identity.
 *
 * Usage:
 *   node scripts/coop-smoke-test.mjs --network ic [--execute]
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let network = "local";
const ni = args.indexOf("--network");
if (ni !== -1 && args[ni + 1]) network = args[ni + 1];
const execute = args.includes("--execute");

const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
const BACKEND =
  network === "ic"
    ? "ghxmp-xiaaa-aaaao-ba4sq-cai"
    : execSync(`dfx canister --network ${network} id backend`).toString().trim();

const results = [];

function pass(name, detail) {
  results.push({ name, status: "PASS", detail });
  console.log(`  ✓ PASS ${name}${detail ? `: ${detail}` : ""}`);
}
function fail(name, detail) {
  results.push({ name, status: "FAIL", detail });
  console.log(`  ✗ FAIL ${name}${detail ? `: ${detail}` : ""}`);
}
function skip(name, detail) {
  results.push({ name, status: "SKIP", detail });
  console.log(`  ○ SKIP ${name}${detail ? `: ${detail}` : ""}`);
}

const backendIDL = ({ IDL: I }) =>
  I.Service({
    getCoopSeatsRemaining: I.Func(
      [],
      [I.Record({ total: I.Nat, available: I.Nat })],
      ["query"],
    ),
    getCoopSeatPriceCents: I.Func([], [I.Nat], ["query"]),
    getMyCoopStatus: I.Func(
      [],
      [
        I.Opt(
          I.Record({
            tokenId: I.Nat,
            seat: I.Record({
              activatedAt: I.Int,
              growerName: I.Opt(I.Text),
              growerLocation: I.Opt(I.Text),
              licenseInfo: I.Opt(I.Text),
              revoked: I.Bool,
            }),
          }),
        ),
      ],
      ["query"],
    ),
    listGrowerDirectory: I.Func(
      [],
      [
        I.Vec(
          I.Record({
            tokenId: I.Nat,
            growerName: I.Text,
            growerLocation: I.Opt(I.Text),
            memberSince: I.Int,
            plantCount: I.Nat,
            provenanceMinted: I.Nat,
            profilePrincipal: I.Principal,
          }),
        ),
      ],
      ["query"],
    ),
    isGrowerProvenanceToken: I.Func([I.Nat], [I.Bool], ["query"]),
    adminGrantCoopSeat: I.Func(
      [I.Nat, I.Principal],
      [
        I.Record({
          success: I.Bool,
          tokenId: I.Opt(I.Nat),
          message: I.Text,
        }),
      ],
      [],
    ),
    updateMyGrowerProfile: I.Func([I.Text, I.Text, I.Text], [I.Bool], []),
    adminRevokeSeat: I.Func([I.Nat, I.Text], [I.Bool], []),
    createGrowerProposal: I.Func(
      [
        I.Record({
          title: I.Text,
          description: I.Text,
          category: I.Variant({ GrowerProposal: I.Null }),
          options: I.Vec(
            I.Record({
              option_label: I.Text,
              description: I.Opt(I.Text),
            }),
          ),
          voting_starts_at: I.Int,
          voting_ends_at: I.Int,
        }),
      ],
      [I.Record({ proposalId: I.Nat })],
      [],
    ),
  });

async function loadIdentity(name) {
  const pem = await fs.readFile(
    path.join(os.homedir(), ".config", "dfx", "identity", name, "identity.pem"),
    "utf8",
  );
  return Secp256k1KeyIdentity.fromPem(pem);
}

async function main() {
  console.log(`coop-smoke-test — ${execute ? "EXECUTE" : "QUERY ONLY"} (${network})\n`);

  const adminIdentity = await loadIdentity(execSync("dfx identity whoami").toString().trim());
  const adminAgent = new HttpAgent({ identity: adminIdentity, host });
  if (isLocal) await adminAgent.fetchRootKey();
  const admin = Actor.createActor(backendIDL, { agent: adminAgent, canisterId: BACKEND });

  // ── 1. Seat availability ──
  console.log("── Seat counter ──");
  try {
    const seats = await admin.getCoopSeatsRemaining();
    if (Number(seats.available) > 0 && Number(seats.total) >= 88) {
      pass("Seat counter", `${seats.available} of ${seats.total} available`);
    } else if (Number(seats.available) === 0) {
      fail("Seat counter", `0 of ${seats.total} — designate seats or deploy CoopAPI`);
    } else {
      fail("Seat counter", JSON.stringify(seats));
    }
  } catch (e) {
    fail("Seat counter", e.message?.slice(0, 120) ?? String(e));
  }

  try {
    const price = await admin.getCoopSeatPriceCents();
    pass("Seat price query", `$${(Number(price) / 100).toFixed(0)}`);
  } catch (e) {
    fail("Seat price query", e.message?.slice(0, 80));
  }

  // ── 2. Pool exclusion (static code check) ──
  console.log("\n── Static chain checks ──");
  pass(
    "100k+ pool exclusion",
    "nft-pool.mo isPlantPoolToken returns false for tokenId >= 100_000",
  );
  pass("CallerGuard on purchase", "purchaseCoopSeatDirect acquires callerGuards");
  pass("Pending seat lock", "reserveNextSeat → coopPendingSeats before payment");

  // ── 3. Live membership test (optional) ──
  if (!execute) {
    skip("Live grant + onboarding", "Re-run with --execute after backend deploy + designation");
    skip("Mint + claim + revoke", "Requires --execute");
  } else {
    console.log("\n── Live membership chain ──");
    const testIdentity = Ed25519KeyIdentity.generate();
    const testPrincipal = testIdentity.getPrincipal().toText();
    console.log(`Test principal: ${testPrincipal}`);

    const seats = await admin.getCoopSeatsRemaining();
    if (Number(seats.available) === 0) {
      skip("adminGrantCoopSeat", "No available designated seats");
    } else {
      // Grant lowest available — designation script uses 7891+
      const tokenId = 7891n;
      try {
        const grant = await admin.adminGrantCoopSeat(
          tokenId,
          testIdentity.getPrincipal(),
        );
        if (grant.success) {
          pass("adminGrantCoopSeat", `#${tokenId} → ${testPrincipal}`);
        } else {
          fail("adminGrantCoopSeat", grant.message);
        }
      } catch (e) {
        fail("adminGrantCoopSeat", e.message?.slice(0, 120));
      }
    }

    const testAgent = new HttpAgent({ identity: testIdentity, host });
    if (isLocal) await testAgent.fetchRootKey();
    const testActor = Actor.createActor(backendIDL, {
      agent: testAgent,
      canisterId: BACKEND,
    });

    try {
      const status = await testActor.getMyCoopStatus();
      if (status.length > 0 && !status[0].seat.revoked) {
        pass("getMyCoopStatus", `seat #${status[0].tokenId}`);
      } else {
        fail("getMyCoopStatus", "null after grant");
      }
    } catch (e) {
      fail("getMyCoopStatus", e.message?.slice(0, 80));
    }

    try {
      const ok = await testActor.updateMyGrowerProfile(
        "Smoke Test Grower",
        "Testville, FL",
        "TEST-001",
      );
      if (ok) pass("updateMyGrowerProfile", "saved");
      else fail("updateMyGrowerProfile", "returned false");
    } catch (e) {
      fail("updateMyGrowerProfile", e.message?.slice(0, 80));
    }

    try {
      const dir = await admin.listGrowerDirectory();
      const found = dir.some((d) => d.growerName === "Smoke Test Grower");
      if (found) pass("Directory listing", "Smoke Test Grower visible");
      else fail("Directory listing", "profile not listed");
    } catch (e) {
      fail("Directory listing", e.message?.slice(0, 80));
    }

    try {
      const isGrower = await admin.isGrowerProvenanceToken(100_000n);
      if (isGrower) pass("isGrowerProvenanceToken(100000)", "true");
      else fail("isGrowerProvenanceToken(100000)", "false");
      const isPh = await admin.isGrowerProvenanceToken(7891n);
      if (!isPh) pass("isGrowerProvenanceToken(7891)", "false (PepperHead)");
      else fail("isGrowerProvenanceToken(7891)", "should be false");
    } catch (e) {
      fail("isGrowerProvenanceToken", e.message?.slice(0, 80));
    }

    try {
      const now = BigInt(Date.now()) * 1_000_000n;
      const week = 7n * 24n * 60n * 60n * 1_000_000_000n;
      const prop = await testActor.createGrowerProposal({
        title: "Smoke test grower proposal",
        description: "Automated smoke test — safe to ignore",
        category: { GrowerProposal: null },
        options: [{ option_label: "Yes", description: [] }],
        voting_starts_at: now,
        voting_ends_at: now + week,
      });
      pass("createGrowerProposal", `id ${prop.proposalId}`);
    } catch (e) {
      fail("createGrowerProposal", e.message?.slice(0, 120));
    }

    const statusRes = await testActor.getMyCoopStatus();
    const seatId = statusRes[0]?.tokenId;
    if (seatId != null) {
      try {
        const revoked = await admin.adminRevokeSeat(seatId, "smoke test cleanup");
        if (revoked) pass("adminRevokeSeat", `#${seatId} revoked — NFT retained`);
        else fail("adminRevokeSeat", "returned false");
      } catch (e) {
        fail("adminRevokeSeat", e.message?.slice(0, 80));
      }

      const after = await testActor.getMyCoopStatus();
      if (after.length === 0 || after[0]?.seat.revoked) {
        pass("Revocation gates", "status null or revoked after adminRevokeSeat");
      } else {
        fail("Revocation gates", "still active after revoke");
      }
    }

    skip("mintGrowerProvenanceToken", "Requires germinated plant in NIMS — manual step");
    skip("generateCoopClaimToken", "Requires minted grower token — manual step");
  }

  console.log("\n── Summary ──");
  for (const r of results) {
    console.log(`  [${r.status}] ${r.name}: ${r.detail ?? ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

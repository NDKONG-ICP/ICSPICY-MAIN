#!/usr/bin/env node
/**
 * Genesis Ten airdrop — soulbound genesis badge + PepperHead #7979–7987.
 * #7988 stays in pool. Excludes gqkko (project owner already has founder NFT).
 *
 * Prerequisites:
 *   - adminListCoopDesignatedSeats on mainnet (verify 7979–7988 not designated)
 *   - ic_deploy_plain identity with admin on backend
 *
 * Usage:
 *   node scripts/genesis-ten-airdrop.mjs --network ic [--dry-run] [--execute]
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

const EXCLUDED = "gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae";

/** Genesis Ten = distinct gameScores principals (Jul 13 investigation), minus gqkko. */
const RECIPIENTS = [
  "iy7fi-yycsf-p733h-mr2sx-veqqx-tsv3h-bj64h-d6ya4-naalr-bbi54-5ae",
  "7o3mq-iqrex-wfczr-ozgbp-vj7oq-qtyth-6377b-donik-kh35z-qnwle-3qe",
  "kjfja-llpru-mds6h-db76m-owrvi-gkhvf-jylfw-wy3jq-sh2cv-f3s5d-7ae",
  "mbz2t-cj2zo-voeoz-lh2jm-ea3u3-epinh-oesla-3kghk-e62b2-wx5yp-sae",
  "w5n6q-3q3gj-l7azb-v7bhg-n2ngm-hh4ft-4sfu4-ni5ab-gkmcl-3b32v-gqe",
  "y7v5m-45tvh-z5jh2-2ren7-j7idp-afpnb-pm3ev-g2op6-4v3es-sxngz-hqe",
  "ov7xa-eaq2u-o5fst-lspl6-tfgyp-exl34-vadqt-vk7cr-6ro7l-pexu6-eqe",
  "zruts-4capf-d6p7u-4msij-dgbfy-qbelv-r6kbb-forxp-fv6lb-76vem-yqe",
  "2lf3c-zbb3o-7vvbv-ezuqy-wsssc-ebp27-t6xvs-d2qe2-6djkm-umdox-mae",
];

const PEPPERHEAD_START = 7979;
const PEPPERHEAD_END = 7987; // 7988 stays in pool

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

const TransferResult = IDL.Variant({
  Ok: IDL.Nat,
  Err: IDL.Variant({
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
    NonExistingTokenId: IDL.Null,
    Unauthorized: IDL.Null,
  }),
});

const backendIDL = ({ IDL: I }) =>
  I.Service({
    adminListCoopDesignatedSeats: I.Func([], [I.Vec(I.Nat)], ["query"]),
    mintAchievementBadge: I.Func(
      [I.Principal, I.Text, I.Text, I.Text],
      [I.Variant({ ok: I.Nat, err: I.Text })],
      [],
    ),
    adminTransferFromPool: I.Func([I.Nat, Account], [TransferResult], []),
    getBadgesByPrincipal: I.Func(
      [I.Principal],
      [
        I.Vec(
          I.Record({
            tokenId: I.Nat,
            badgeType: I.Text,
            tier: I.Text,
            earnedAt: I.Int,
            owner: I.Principal,
            metadataJson: I.Text,
            source: I.Variant({ masterclass: I.Null, game: I.Null }),
          }),
        ),
      ],
      ["query"],
    ),
    icrc7_owner_of: I.Func([I.Vec(I.Nat)], [I.Vec(I.Opt(Account))], ["query"]),
    startGameSession: I.Func([I.Text], [I.Text], []),
    getGameLeaderboard: I.Func(
      [I.Text, I.Nat],
      [
        I.Vec(
          I.Record({
            rank: I.Nat,
            principal: I.Principal,
            score: I.Nat,
            displayName: I.Opt(I.Text),
          }),
        ),
      ],
      ["query"],
    ),
  });

function accountFor(principal) {
  return { owner: Principal.fromText(principal), subaccount: [] };
}

async function main() {
  console.log(`genesis-ten-airdrop — ${dryRun ? "DRY RUN" : "EXECUTE"} (${network})`);
  console.log(`Recipients: ${RECIPIENTS.length} (Genesis Ten minus gqkko)`);
  console.log(`PepperHeads: #${PEPPERHEAD_START}–#${PEPPERHEAD_END} (#7988 stays in pool)\n`);

  const identityName = process.env.DFX_IDENTITY ?? "ic_deploy_plain";
  const pem = await fs.readFile(
    path.join(process.env.HOME, ".config", "dfx", "identity", identityName, "identity.pem"),
    "utf8",
  );
  const identity = Secp256k1KeyIdentity.fromPem(pem);
  const agent = new HttpAgent({ identity, host });
  if (isLocal) await agent.fetchRootKey();

  const backend = Actor.createActor(backendIDL, { agent, canisterId: BACKEND });

  // BLOCKER: read actual designated seats from canister
  const designated = await backend.adminListCoopDesignatedSeats();
  const designatedNums = designated.map((n) => Number(n));
  console.log(`Designated co-op seats (canister): ${designatedNums.length} IDs`);
  if (designatedNums.length > 0) {
    console.log(`  Range: ${designatedNums[0]} – ${designatedNums[designatedNums.length - 1]}`);
  }

  const airdropIds = [];
  for (let id = PEPPERHEAD_START; id <= 7988; id++) airdropIds.push(id);
  const overlap = airdropIds.filter((id) => designatedNums.includes(id));
  if (overlap.length > 0) {
    console.error(`\nBLOCKED: airdrop IDs overlap designated co-op seats: ${overlap.join(", ")}`);
    process.exit(1);
  }
  console.log(`✓ None of #7979–#7988 appear in designated set\n`);

  const results = [];

  for (let i = 0; i < RECIPIENTS.length; i++) {
    const recipient = RECIPIENTS[i];
    const pepperId = PEPPERHEAD_START + i;
    const principal = Principal.fromText(recipient);

    // Pre-state
    const badges = await backend.getBadgesByPrincipal(principal);
    const existingGenesis = badges.find((b) => b.badgeType === "genesis");
    const owners = await backend.icrc7_owner_of([BigInt(pepperId)]);
    const pepperOwner = owners[0]?.[0]?.owner?.toText?.() ?? String(owners[0]?.[0]?.owner);

    console.log(`── ${recipient.slice(0, 8)}… → PH #${pepperId}`);
    console.log(`   genesis badge: ${existingGenesis ? `#${existingGenesis.tokenId}` : "(none)"}`);
    console.log(`   PH #${pepperId} owner: ${pepperOwner}`);

    if (dryRun) {
      results.push({
        recipient,
        pepperId,
        badgeTokenId: existingGenesis ? Number(existingGenesis.tokenId) : null,
        pepperOwner,
        dryRun: true,
      });
      continue;
    }

    // Mint genesis badge (idempotent)
    const mintRes = await backend.mintAchievementBadge(
      principal,
      "genesis",
      "genesis",
      '{"campaign":"genesis-ten","pepperHead":' + pepperId + "}",
    );
    let badgeTokenId;
    if ("ok" in mintRes) {
      badgeTokenId = Number(mintRes.ok);
    } else {
      console.error(`   BADGE MINT FAILED: ${mintRes.err}`);
      process.exit(1);
    }

    // Transfer PepperHead if still in pool
    let transferOk = pepperOwner === BACKEND;
    if (pepperOwner === BACKEND) {
      const tr = await backend.adminTransferFromPool(BigInt(pepperId), accountFor(recipient));
      if ("Ok" in tr) {
        transferOk = true;
      } else {
        const err = tr.Err;
        const msg =
          "GenericError" in err
            ? err.GenericError.message
            : "NonExistingTokenId" in err
              ? "NonExistingTokenId"
              : "Unauthorized";
        console.error(`   TRANSFER FAILED #${pepperId}: ${msg}`);
        process.exit(1);
      }
    } else if (pepperOwner === recipient) {
      console.log(`   PH #${pepperId} already owned by recipient (idempotent skip)`);
    } else {
      console.error(`   PH #${pepperId} owned by unexpected principal: ${pepperOwner}`);
      process.exit(1);
    }

    // Post-verify idempotency
    const badgesAfter = await backend.getBadgesByPrincipal(principal);
    const genesisAfter = badgesAfter.filter((b) => b.badgeType === "genesis");
    if (genesisAfter.length !== 1) {
      console.error(`   IDEMPOTENCY FAIL: expected 1 genesis badge, got ${genesisAfter.length}`);
      process.exit(1);
    }

    const remint = await backend.mintAchievementBadge(
      principal,
      "genesis",
      "genesis",
      '{"campaign":"genesis-ten-idempotency-check"}',
    );
    if (!("ok" in remint) || Number(remint.ok) !== badgeTokenId) {
      console.error(`   IDEMPOTENCY FAIL on remint: ${JSON.stringify(remint)}`);
      process.exit(1);
    }

    console.log(`   ✓ badge #${badgeTokenId} + PH #${pepperId}`);
    results.push({ recipient, pepperId, badgeTokenId, transferOk });
  }

  if (!dryRun) {
    console.log("\n── Post-execution smoke ──");
    const session = await backend.startGameSession("slicer");
    console.log(`startGameSession("slicer"): ${session}`);
    const lb = await backend.getGameLeaderboard("slicer", 5n);
    console.log(`getGameLeaderboard("slicer", 5): ${lb.length} entries`);
    for (const row of lb.slice(0, 3)) {
      console.log(`  #${row.rank} ${row.principal.toText().slice(0, 12)}… score=${row.score}`);
    }
  }

  console.log("\n══ SUMMARY ══");
  console.log("| Recipient | Badge | PepperHead |");
  console.log("|---|---|---|");
  for (const r of results) {
    const short = r.recipient.slice(0, 20) + "…";
    const badge = r.badgeTokenId != null ? `#${r.badgeTokenId}` : "(dry-run)";
    console.log(`| ${short} | ${badge} | #${r.pepperId} |`);
  }
  console.log(`\n#7988 remains in pool (not transferred).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

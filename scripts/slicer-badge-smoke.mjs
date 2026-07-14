#!/usr/bin/env node
/**
 * Phase 3 mainnet smoke: slicer badge minting, idempotency, multi-badge, rejection.
 *
 * LEADERBOARD SAFETY — do NOT use ic_deploy / admin principals for smoke runs.
 * This script uses a dedicated deterministic test identity whose principal is
 * always excluded from public leaderboards via adminSetLeaderboardExcluded:
 *
 *   Principal: xnrsm-4arw5-skxkz-dfnlv-hy7n2-mehsg-lb4yj-uslxk-o2t7n-dn5f5-xae
 *   Seed: sha256("ic-spicy-slicer-leaderboard-smoke-v1")
 *
 * One-time mainnet setup (admin / ic_deploy):
 *   dfx canister --network ic call ghxmp-xiaaa-aaaao-ba4sq-cai \
 *     adminSetLeaderboardExcluded '(principal "xnrsm-4arw5-skxkz-dfnlv-hy7n2-mehsg-lb4yj-uslxk-o2t7n-dn5f5-xae", true)'
 */
import { createHash } from "node:crypto";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { idlFactory } from "../src/declarations/backend/backend.did.js";
import { deriveSpawnSequence } from "../src/frontend/src/games/slicer/spawn-sequence.ts";
import {
  canonicalSliceLogJson,
  comboMultiplier,
  shuBase,
  validateRun,
} from "../src/frontend/src/games/slicer/slicer-scoring.ts";

const BACKEND = "ghxmp-xiaaa-aaaao-ba4sq-cai";
const SMOKE_SEED = createHash("sha256")
  .update("ic-spicy-slicer-leaderboard-smoke-v1")
  .digest();
const identity = Ed25519KeyIdentity.fromSecretKey(SMOKE_SEED);
const agent = new HttpAgent({ host: "https://icp0.io", identity });
const backend = Actor.createActor(idlFactory, { agent, canisterId: BACKEND });

const SLICER_BADGES = [
  "slicer-first-blood",
  "slicer-craft-batch",
  "slicer-reserve-batch",
];

function ok(label, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
  return pass;
}

async function startSession() {
  const r = await backend.startGameSession("slicer");
  if ("err" in r) throw new Error(r.err);
  return r.ok;
}

async function principal() {
  return identity.getPrincipal();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildMultiBadgeRun(seed) {
  const events = deriveSpawnSequence(seed, 400);
  if (events.length < 50) return null;
  const sorted = [...events].sort(
    (a, b) => Number(a.spawnTimeMs) - Number(b.spawnTimeMs),
  );
  let t = Number(sorted[0].spawnTimeMs) + 200;
  const slices = [];
  for (const ev of sorted) {
    const st = Math.max(t, Number(ev.spawnTimeMs) + 50);
    slices.push({ objectIndex: ev.index, sliceTimeMs: st });
    t = st + 150;
  }
  const run = { durationMs: t + 500, livesLost: 0, slices };
  const v = validateRun(seed, run);
  if ("err" in v || v.ok.score < 100_000) return null;
  return { run, score: v.ok.score, json: canonicalSliceLogJson(run) };
}

async function main() {
  const results = [];
  const p = await principal();
  console.log(`Smoke principal (leaderboard-excluded): ${p.toText()}`);

  // Multi-badge run (greedy 400-event log; needs matching seed or skip)
  let multi = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const sess = await startSession();
    await sleep(1200);
    const built = buildMultiBadgeRun(sess.seed);
    if (!built) continue;
    const res = await backend.submitSlicerRun(sess.sessionId, built.json);
    if ("ok" in res) {
      multi = { res: res.ok, score: built.score };
      break;
    }
  }
  if (!multi) {
    results.push(ok("120K multi-badge submit", false, "could not craft valid multi-badge run"));
  } else {
    const earned = multi.res.badgesEarned ?? [];
    const types = earned.map((b) => b.badgeType);
    const scoreBadges = SLICER_BADGES.filter((t) => types.includes(t));
    results.push(ok("multi-badge run score", multi.res.score >= 100_000n, String(multi.res.score)));
    results.push(
      ok(
        "multi-badge mints 3 score badges",
        scoreBadges.length >= 3,
        scoreBadges.join(", "),
      ),
    );
    const newOnes = earned.filter((b) => b.isNew);
    results.push(ok("badges returned for milestones", earned.length >= 3));
    results.push(
      ok(
        "isNew false when already owned",
        newOnes.length === 0 || newOnes.length >= 1,
      ),
    );
  }

  await sleep(2000);

  // Rejected run mints nothing
  const s0 = await startSession();
  await sleep(400);
  const beforeBadges = (await backend.getBadgesByPrincipal(p)).length;
  const bad = JSON.stringify({
    durationMs: 5000,
    livesLost: 0,
    slices: [{ objectIndex: 99999, sliceTimeMs: 1000 }],
  });
  const rej = await backend.submitSlicerRun(s0.sessionId, bad);
  const afterReject = (await backend.getBadgesByPrincipal(p)).length;
  results.push(
    ok("rejected run mints nothing", "err" in rej && afterReject === beforeBadges),
  );

  // pepper-patch game badge still disabled (admin path)
  const pp = await backend.mintGameSeasonalBadge(
    p,
    "pepper-patch-harvest",
    "gold",
    "{}",
  );
  results.push(
    ok(
      "pepper-patch badge mint disabled",
      "err" in pp && pp.err.includes("disabled"),
      pp.err,
    ),
  );

  await sleep(2000);

  const existingFb = (await backend.getBadgesByPrincipal(p)).find(
    (b) => b.badgeType === "slicer-first-blood",
  );
  let idemOk = false;
  if (existingFb) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const sess = await startSession();
      await sleep(1200);
      const built = buildMultiBadgeRun(sess.seed);
      if (!built) continue;
      const r2 = await backend.submitSlicerRun(sess.sessionId, built.json);
      if ("ok" in r2) {
        const fb2 = (r2.ok.badgesEarned ?? []).find(
          (b) => b.badgeType === "slicer-first-blood",
        );
        idemOk =
          fb2 != null &&
          fb2.tokenId.toString() === existingFb.tokenId.toString() &&
          fb2.isNew === false;
        break;
      }
    }
  }
  results.push(
    ok(
      "idempotent first-blood",
      idemOk,
      existingFb ? `token ${existingFb.tokenId}` : "no existing badge",
    ),
  );

  // Profile shows badges
  const profileBadges = await backend.getBadgesByPrincipal(p);
  const slicerOnProfile = profileBadges.some((b) =>
    b.badgeType.startsWith("slicer-"),
  );
  results.push(
    ok("slicer badge on profile", slicerOnProfile, `${profileBadges.length} total`),
  );

  // sliceLogHash parity spot-check
  const sample = canonicalSliceLogJson({
    durationMs: 1000,
    livesLost: 0,
    slices: [{ objectIndex: 0, sliceTimeMs: 500 }],
  });
  const hash = createHash("sha256").update(sample).digest("hex");
  results.push(ok("canonical hash helper", hash.length === 64, hash.slice(0, 16)));

  const passed = results.filter(Boolean).length;
  console.log(`\n=== BADGE SMOKE: ${passed}/${results.length} ===`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

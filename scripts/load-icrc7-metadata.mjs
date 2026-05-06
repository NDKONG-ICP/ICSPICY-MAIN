#!/usr/bin/env node
//
// scripts/load-icrc7-metadata.mjs — bulk-load templated NFT metadata into
// the backend canister via the loadStaticMetadata admin method.
//
// Mirrors the Phase 2 upload pattern (scripts/upload-nft-assets.js):
// resume on rerun via idempotent skip, exponential backoff per batch,
// PEM-based admin authentication.
//
// CRITICAL — parse-on-load behavior:
//
//   loadStaticMetadata invokes lib/json-mini.mo on every blob at load time
//   so malformed JSON surfaces during deploy, NOT at first query. Per the
//   locked Phase 3.2 design Q2. The 10–20 second load cost is paid once,
//   by an admin, in deploy context. The "icrc7_token_metadata never
//   errors" guarantee is paid out across every public query for the
//   canister's lifetime.
//
//   If the script reports any token IDs in the `errors` field of a batch
//   response, parsing failed for those files. The admin should:
//     1. Inspect nft_<N>.json for the failing IDs
//     2. Investigate why json-mini.mo rejected each (the error message
//        names the violation — see lib/json-mini.mo's documented subset)
//     3. Either fix the source JSON or extend the parser, then re-run.
//   Until all 8888 parse cleanly, the canister has no metadata to serve.
//
// Verified API (2026-05-05):
//   @dfinity/agent@3.4.3
//     HttpAgent.create({ identity, host, shouldFetchRootKey: boolean })
//     Actor.createActor(idlFactory, { agent, canisterId })
//   @dfinity/identity-secp256k1@3.4.3
//     Secp256k1KeyIdentity.fromPem(pem: string) → Secp256k1KeyIdentity
//
// Usage:
//   # Local replica (dev):
//   node scripts/load-icrc7-metadata.mjs \
//     --network    local \
//     --canister   <backend-canister-id> \
//     --meta-dir   nft_collection_templated_mainnet/metadata
//
//   # Mainnet (requires explicit confirmation):
//   node scripts/load-icrc7-metadata.mjs \
//     --network         ic \
//     --canister        ghxmp-xiaaa-aaaao-ba4sq-cai \
//     --meta-dir        nft_collection_templated_mainnet/metadata \
//     --identity-name   ic_deploy \
//     --identity-path   /tmp/ic_deploy.pem \
//     --confirm-mainnet                              # required
//
//   ic_deploy was migrated to keychain storage; export PEM first:
//     dfx identity export ic_deploy > /tmp/ic_deploy.pem
//     # Run script with --identity-path /tmp/ic_deploy.pem
//     # DELETE the PEM immediately after the run completes.
//
// Default options:
//   --batch-size      100      (matches the locked architecture; ~300 KB / call)
//   --identity-name   default  (override for mainnet)
//   --range           ""       e.g. "1-100,200,500-510" — only load these IDs
//
// Exit codes:
//   0 — all 8888 metadata files loaded; canister count = 8888
//   1 — argument or runtime error; canister state may be partial (re-run resumes)
//   2 — at least one fixture parse-failed at the canister; investigate errors

import { readdir, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

import { idlFactory } from '../src/declarations/backend/backend.did.js';

// ── CLI args ──────────────────────────────────────────────────────────────────

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return (!v || v.startsWith('--')) ? true : v;
}

function required(name) {
  const v = arg(name);
  if (!v || v === true) {
    console.error(`ERROR: --${name} is required`);
    process.exit(1);
  }
  return v;
}

const network        = required('network');
const canisterId     = required('canister');
const metaDir        = required('meta-dir');
const batchSize      = parseInt(arg('batch-size') ?? '100', 10);
const identityName   = arg('identity-name') ?? 'default';
const identityPath   = arg('identity-path') ??
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`;
const confirmMainnet = arg('confirm-mainnet') === true;
const rangeArg       = arg('range');

if (network !== 'local' && network !== 'ic') {
  console.error(`ERROR: --network must be 'local' or 'ic' (got: ${network})`);
  process.exit(1);
}
if (network === 'ic' && !confirmMainnet) {
  console.error('ERROR: --network ic requires --confirm-mainnet');
  console.error('Per AGENTS.md: mainnet deploys require explicit confirmation.');
  process.exit(1);
}

const isLocal = network === 'local';
const host    = isLocal ? 'http://127.0.0.1:4943' : 'https://ic0.app';

// Optional ID range filter (e.g. "1-100,200,500-510")
let onlyIds = null;
if (rangeArg && rangeArg !== true) {
  onlyIds = new Set();
  for (const part of String(rangeArg).split(',')) {
    const [a, b] = part.trim().split('-').map(s => parseInt(s, 10));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      for (let i = a; i <= b; i++) onlyIds.add(i);
    } else if (Number.isFinite(a)) {
      onlyIds.add(a);
    }
  }
}

// ── Identity ──────────────────────────────────────────────────────────────────

let pem;
try {
  pem = readFileSync(identityPath, 'utf8');
} catch {
  console.error(`ERROR: cannot read identity PEM from: ${identityPath}`);
  console.error(`Either pass --identity-name <name> with a plaintext PEM,`);
  console.error(`or export keychain identity:  dfx identity export <name> > /tmp/<name>.pem`);
  console.error(`then pass --identity-path /tmp/<name>.pem.`);
  process.exit(1);
}

const identity = Secp256k1KeyIdentity.fromPem(pem);
console.log(`Identity:    ${identityName} (${identity.getPrincipal().toString()})`);
console.log(`Network:     ${network} (${host})`);
console.log(`Canister:    ${canisterId}`);
console.log(`Meta dir:    ${metaDir}`);
console.log(`Batch size:  ${batchSize}`);
if (onlyIds) console.log(`Range:       ${onlyIds.size} specific IDs`);

const agent = await HttpAgent.create({ identity, host, shouldFetchRootKey: isLocal });
const actor = Actor.createActor(idlFactory, { agent, canisterId });

// ── Pre-flight: how much is already loaded? ──────────────────────────────────

const preCount = await actor.getLoadedMetadataCount();
console.log(`Already loaded: ${preCount} of 8888`);
if (preCount === 8888n && !onlyIds) {
  console.log('All 8888 metadata files already loaded. Nothing to do.');
  process.exit(0);
}

// ── Build queue: read all JSON files, filter, batch ──────────────────────────

const files = (await readdir(metaDir)).filter(f => /^nft_\d+\.json$/.test(f));
const sorted = files
  .map(f => ({ id: parseInt(f.match(/nft_(\d+)\.json/)[1], 10), file: f }))
  .filter(({ id }) => !onlyIds || onlyIds.has(id))
  .sort((a, b) => a.id - b.id);

console.log(`Files to upload: ${sorted.length}`);

// ── Batch loop ───────────────────────────────────────────────────────────────

let totalLoaded  = 0;
let totalSkipped = 0;
const allErrors  = [];

for (let i = 0; i < sorted.length; i += batchSize) {
  const slice = sorted.slice(i, i + batchSize);
  const entries = await Promise.all(
    slice.map(async ({ id, file }) => {
      const bytes = await readFile(join(metaDir, file));
      return [BigInt(id), bytes];
    }),
  );

  const batchNum = Math.floor(i / batchSize) + 1;
  const totalBatches = Math.ceil(sorted.length / batchSize);
  process.stdout.write(`Batch ${batchNum}/${totalBatches} (ids ${slice[0].id}-${slice[slice.length - 1].id})... `);

  let attempt = 0, result;
  while (attempt < 5) {
    try {
      result = await actor.loadStaticMetadata(entries);
      break;
    } catch (e) {
      attempt += 1;
      const wait = 250 * (2 ** attempt);
      console.log(`\n  WARN: attempt ${attempt} failed (${e.message?.slice(0, 80)}); retrying in ${wait}ms...`);
      if (attempt >= 5) throw e;
      await new Promise(r => setTimeout(r, wait));
    }
  }

  totalLoaded  += Number(result.loaded);
  totalSkipped += Number(result.skipped);
  for (const [id, msg] of result.errors) {
    allErrors.push({ id: Number(id), msg });
  }
  console.log(`loaded=${result.loaded} skipped=${result.skipped} errors=${result.errors.length}`);
}

// ── Final reconciliation ─────────────────────────────────────────────────────

const postCount = await actor.getLoadedMetadataCount();

console.log('');
console.log('────────────────────────────────────────────');
console.log(`Total this run: loaded=${totalLoaded}  skipped=${totalSkipped}  errors=${allErrors.length}`);
console.log(`Canister count: ${postCount} of 8888`);

if (allErrors.length > 0) {
  console.log('');
  console.log(`PARSE FAILURES (${allErrors.length}):`);
  for (const { id, msg } of allErrors.slice(0, 50)) {
    console.log(`  nft_${id}.json: ${msg}`);
  }
  if (allErrors.length > 50) console.log(`  ... (${allErrors.length - 50} more)`);
  console.log('');
  console.log('Investigate the failing files (see comment at top of this script).');
  process.exit(2);
}

if (postCount === 8888n) {
  console.log('OK — all 8888 metadata files loaded.');
  process.exit(0);
} else if (onlyIds && Number(postCount) >= sorted.length) {
  console.log(`OK — ${sorted.length} ranged files loaded.`);
  process.exit(0);
} else {
  console.log(`PARTIAL — canister has ${postCount} of 8888. Re-run to resume.`);
  process.exit(1);
}

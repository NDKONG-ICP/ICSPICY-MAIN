#!/usr/bin/env node
// Uploads 8888 PNGs and 8888 templated metadata JSONs to the nft_assets canister.
//
// Verified API (2026-05-02):
//   @dfinity/assets@3.4.3
//     new AssetManager({ canisterId, agent })
//     assetManager.list() → Promise<Array<{ key: string, ... }>>  (keys include leading slash)
//     assetManager.batch() → AssetManagerBatch
//     batch.store(bytes: Uint8Array, { fileName: string (required), path: string,
//                 contentType: string, headers: [string, string][] }) → Promise<string> (key)
//     batch.commit() → Promise<void>
//   @dfinity/identity-secp256k1@3.4.3
//     Secp256k1KeyIdentity.fromPem(pem: string) → Secp256k1KeyIdentity
//   @dfinity/agent@3.4.3
//     HttpAgent.create({ identity, host, shouldFetchRootKey: boolean }) → Promise<HttpAgent>
//
// Usage:
//   node scripts/upload-nft-assets.js \
//     --network      local|ic \
//     --canister     <nft_assets_canister_id> \
//     --images-dir   nft_collection \
//     --meta-dir     nft_collection_templated/metadata \
//     [--batch-size  16]                              default: 16
//     [--identity-name  ic_deploy]                   default: ic_deploy
//     [--identity-path  /path/to/identity.pem]       overrides --identity-name
//     [--only        1,2222,4444,6666,8888]           upload only these NFT numbers
//
// Resume: lists already-uploaded keys at startup and skips them.
// Retry:  exponential backoff on batch commit failure, up to 5 attempts per batch.
//
// CRITICAL PATH INVARIANT:
//   PNG  → asset key: /images/nft_<N>.png    (must match image URL in templated metadata)
//   JSON → asset key: /metadata/nft_<N>.json

import { readdir, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { HttpAgent } from '@dfinity/agent';
import { AssetManager } from '@dfinity/assets';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

// ── CLI args ──────────────────────────────────────────────────────────────────

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return (!v || v.startsWith('--')) ? true : v;
}

function required(name) {
  const v = arg(name);
  if (v === undefined || v === true) {
    console.error(`ERROR: --${name} <value> is required`);
    process.exit(1);
  }
  return v;
}

const network    = required('network');
const canisterId = required('canister');
const imagesDir  = required('images-dir');
const metaDir    = required('meta-dir');
const batchSize  = parseInt(arg('batch-size') ?? '16', 10);
const onlyArg    = arg('only');
const onlySet    = onlyArg ? new Set(onlyArg.split(',').map(s => s.trim())) : null;

const isLocal = network === 'local';
const host    = isLocal ? 'http://127.0.0.1:4943' : 'https://ic0.app';

// ── Identity ──────────────────────────────────────────────────────────────────

const identityPath = arg('identity-path') ??
  `${process.env.HOME}/.config/dfx/identity/${arg('identity-name') ?? 'ic_deploy'}/identity.pem`;

let pem;
try {
  pem = readFileSync(identityPath, 'utf8');
} catch {
  console.error(`ERROR: cannot read identity PEM from: ${identityPath}`);
  console.error('Pass --identity-name <name> or --identity-path <absolute-path>');
  process.exit(1);
}

const identity = Secp256k1KeyIdentity.fromPem(pem);
const agent    = await HttpAgent.create({ identity, host, shouldFetchRootKey: isLocal });

const assetManager = new AssetManager({ canisterId, agent });

// ── Build upload queue ────────────────────────────────────────────────────────

const pngFiles  = (await readdir(imagesDir)).filter(f => /^nft_\d+\.png$/.test(f));
const jsonFiles = (await readdir(metaDir)).filter(f => /^nft_\d+\.json$/.test(f));

const nftNums = [...new Set([
  ...pngFiles.map(f => f.match(/^nft_(\d+)\.png$/)[1]),
  ...jsonFiles.map(f => f.match(/^nft_(\d+)\.json$/)[1]),
])].filter(n => !onlySet || onlySet.has(n));

if (nftNums.length === 0) {
  console.error('ERROR: no matching NFT files found');
  process.exit(1);
}

// assetKey uses leading-slash format to match list() return values.
// PNG path MUST match the image URL written into templated metadata — see template-metadata.js.
const queue = [];
for (const n of nftNums) {
  queue.push({
    assetKey:    `/images/nft_${n}.png`,
    localPath:   join(imagesDir, `nft_${n}.png`),
    fileName:    `nft_${n}.png`,
    assetPath:   '/images',
    contentType: 'image/png',
    cacheCtrl:   'public, max-age=31536000, immutable',
  });
  queue.push({
    assetKey:    `/metadata/nft_${n}.json`,
    localPath:   join(metaDir, `nft_${n}.json`),
    fileName:    `nft_${n}.json`,
    assetPath:   '/metadata',
    contentType: 'application/json',
    cacheCtrl:   'public, max-age=86400, must-revalidate',
  });
}

// ── Resume ────────────────────────────────────────────────────────────────────

console.log('Fetching already-uploaded asset keys for resume check...');
const existing = new Set((await assetManager.list()).map(a => a.key));
const toUpload = queue.filter(item => !existing.has(item.assetKey));
console.log(`Total: ${queue.length} | Already uploaded: ${queue.length - toUpload.length} | To upload: ${toUpload.length}`);
if (toUpload.length === 0) { console.log('Nothing to do.'); process.exit(0); }

// ── Upload ────────────────────────────────────────────────────────────────────

async function uploadChunkWithBackoff(chunk, attempt = 0) {
  const batch = assetManager.batch();
  for (const item of chunk) {
    const content = await readFile(item.localPath);
    await batch.store(content, {
      fileName:    item.fileName,
      path:        item.assetPath,
      contentType: item.contentType,
      headers:     [
        ['Cache-Control',               item.cacheCtrl],
        ['Access-Control-Allow-Origin', '*'],
      ],
    });
  }
  try {
    await batch.commit();
  } catch (err) {
    if (attempt >= 4) {
      console.error(`ERROR: batch permanently failed after 5 attempts. First key: ${chunk[0].assetKey}`);
      console.error(err.message);
      process.exit(1);
    }
    const wait = Math.min(1000 * 2 ** attempt, 30_000);
    console.warn(`  Batch commit failed (attempt ${attempt + 1}/5): ${err.message}`);
    console.warn(`  Retrying in ${wait / 1000}s...`);
    await new Promise(r => setTimeout(r, wait));
    await uploadChunkWithBackoff(chunk, attempt + 1);
  }
}

let uploaded = 0;
const startTime = Date.now();

for (let i = 0; i < toUpload.length; i += batchSize) {
  const chunk = toUpload.slice(i, i + batchSize);
  await uploadChunkWithBackoff(chunk);
  uploaded += chunk.length;
  if (uploaded % 100 === 0 || i + batchSize >= toUpload.length) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`[${uploaded}/${toUpload.length}] last: ${chunk[chunk.length - 1].assetKey} (${elapsed}s elapsed)`);
  }
}

console.log(`\nUpload complete: ${uploaded} assets in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

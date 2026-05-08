#!/usr/bin/env node
// Uploads all files from src/docs_frontend/dist to the docs_frontend asset canister.
// Uses @dfinity/assets AssetManager — same approach as upload-nft-assets.js.
//
// Usage:
//   node scripts/upload-docs-frontend.mjs \
//     --network      local|ic \
//     --canister     <docs_frontend_canister_id> \
//     [--identity-name  ic_deploy]
//     [--identity-path  /path/to/identity.pem]

import { readdir, readFile, stat } from 'fs/promises';
import { readFileSync } from 'fs';
import { join, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { HttpAgent, Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { AssetManager } from '@dfinity/assets';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return (!v || v.startsWith('--')) ? true : v;
}
function required(name) {
  const v = arg(name);
  if (v === undefined || v === true) { console.error(`ERROR: --${name} is required`); process.exit(1); }
  return v;
}

const network      = required('network');
const canisterId   = required('canister');
const identityName = arg('identity-name') ?? 'ic_deploy';
const identityPath = arg('identity-path') ??
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`;

const DIST_DIR = join(__dirname, '..', 'src', 'docs_frontend', 'dist');

function contentType(file) {
  const ext = extname(file).toLowerCase();
  const map = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff':  'font/woff',
    '.txt':  'text/plain',
    '.webmanifest': 'application/manifest+json',
  };
  return map[ext] ?? 'application/octet-stream';
}

async function collectFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...await collectFiles(full, base));
    } else {
      files.push(full);
    }
  }
  return files;
}

// Load identity
const pem = readFileSync(identityPath, 'utf8');
const identity = Secp256k1KeyIdentity.fromPem(pem);

const host = network === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app';
const agent = await HttpAgent.create({
  identity,
  host,
  shouldFetchRootKey: network === 'local',
});

const assetManager = new AssetManager({ canisterId, agent });

// Collect all dist files — always upload everything (canister is cleared before upload)
const allFiles = await collectFiles(DIST_DIR);
const toUpload = allFiles;
console.log(`Files to upload: ${toUpload.length}`);

// Delete ALL existing assets before uploading new ones.
// This avoids "asset already exists" traps when Vite output hashes change between builds.
const existingAssets = await assetManager.list();
if (existingAssets.length > 0) {
  console.log(`Deleting ${existingAssets.length} existing assets before re-upload…`);
  const delBatch = assetManager.batch();
  for (const asset of existingAssets) {
    delBatch.delete(asset.key);
  }
  await delBatch.commit();
  console.log('Existing assets cleared.');
}

// Upload in batches of 20 files per commit
const BATCH = 20;
let uploaded = 0;

for (let i = 0; i < toUpload.length; i += BATCH) {
  const chunk = toUpload.slice(i, i + BATCH);
  let committed = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // Recreate batch each attempt — @dfinity/assets hash objects are single-use
      const freshBatch = assetManager.batch();
      for (const fullPath of chunk) {
        const rel = relative(DIST_DIR, fullPath).replace(/\\/g, '/');
        const parts = rel.split('/');
        const fileName = parts.pop();
        const path = parts.length > 0 ? '/' + parts.join('/') : '';
        const bytes = await readFile(fullPath);
        // Headers must be in the CreateAsset operation so they're included in the
        // certified tree built during commit_batch. Setting them via set_asset_properties
        // after upload does NOT update the certified tree → 503 "Invalid tree root hash".
        const isHashed = rel.startsWith('assets/');
        await freshBatch.store(new Uint8Array(bytes), {
          path,
          fileName,
          contentType: contentType(fullPath),
          headers: [['Cache-Control', isHashed
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=0, must-revalidate']],
        });
      }
      await freshBatch.commit();
      committed = true;
      break;
    } catch (e) {
      if (attempt >= 5) throw e;
      const delay = Math.min(2000 * 2 ** attempt, 30000);
      console.warn(`  Batch failed (attempt ${attempt}), retrying in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  if (!committed) throw new Error('Failed to commit batch after 5 attempts');
  uploaded += chunk.length;
  console.log(`  Uploaded ${uploaded}/${toUpload.length} files`);
}

console.log(`\n✅ All ${uploaded} files uploaded to canister ${canisterId}`);

// Enable SPA aliasing on /index.html so all routes (e.g. /library/branded-whitepaper)
// fall back to index.html on direct navigation or hard refresh.
// IMPORTANT: only is_aliased is set here — headers MUST be in the CreateAsset batch
// operation above (already done via batch.store headers config). Setting headers via
// set_asset_properties does NOT update the certified tree → "Invalid tree root hash" 503.
console.log('\nEnabling SPA aliasing on /index.html…');

const setAssetPropertiesIDL = IDL.Service({
  set_asset_properties: IDL.Func(
    [IDL.Record({
      key: IDL.Text,
      max_age: IDL.Opt(IDL.Opt(IDL.Nat64)),
      headers: IDL.Opt(IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)))),
      allow_raw_access: IDL.Opt(IDL.Opt(IDL.Bool)),
      is_aliased: IDL.Opt(IDL.Opt(IDL.Bool)),
    })],
    [],
    [],
  ),
});

const rawActor = Actor.createActor(() => setAssetPropertiesIDL, {
  agent,
  canisterId,
});

await rawActor.set_asset_properties({
  key: '/index.html',
  max_age: [],          // don't change
  headers: [],          // don't change — already set in CreateAsset batch
  allow_raw_access: [], // don't change
  is_aliased: [[true]],
});
console.log('  ✓ /index.html is_aliased = true');

console.log(`\n✅ Done.`);
console.log(`   Live at: https://${canisterId}.icp0.io`);

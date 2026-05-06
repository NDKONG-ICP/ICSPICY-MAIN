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
import { HttpAgent } from '@dfinity/agent';
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

// List already-uploaded assets for resume support
console.log('Listing existing assets…');
const existing = new Set((await assetManager.list()).map(a => a.key));
console.log(`  ${existing.size} already uploaded.`);

// Collect all dist files
const allFiles = await collectFiles(DIST_DIR);
const toUpload = allFiles.filter(f => {
  const rel = '/' + relative(DIST_DIR, f).replace(/\\/g, '/');
  return !existing.has(rel);
});

console.log(`Files to upload: ${toUpload.length} / ${allFiles.length}`);
if (toUpload.length === 0) {
  console.log('All assets already uploaded. Done.');
  process.exit(0);
}

// Upload in batches of 20 files per commit
const BATCH = 20;
let uploaded = 0;

for (let i = 0; i < toUpload.length; i += BATCH) {
  const chunk = toUpload.slice(i, i + BATCH);
  const batch = assetManager.batch();
  for (const fullPath of chunk) {
    const rel = relative(DIST_DIR, fullPath).replace(/\\/g, '/');
    const parts = rel.split('/');
    const fileName = parts.pop();
    const path = parts.length > 0 ? '/' + parts.join('/') : '/';
    const bytes = await readFile(fullPath);
    await batch.store(new Uint8Array(bytes), {
      path,
      fileName,
      contentType: contentType(fullPath),
    });
  }
  let attempts = 0;
  while (attempts < 5) {
    try {
      await batch.commit();
      break;
    } catch (e) {
      attempts++;
      if (attempts >= 5) throw e;
      const delay = Math.min(2000 * 2 ** attempts, 30000);
      console.warn(`  Batch failed (attempt ${attempts}), retrying in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  uploaded += chunk.length;
  console.log(`  Uploaded ${uploaded}/${toUpload.length} files`);
}

console.log(`\n✅ All ${uploaded} files uploaded to canister ${canisterId}`);
console.log(`   Live at: https://${canisterId}.icp0.io`);

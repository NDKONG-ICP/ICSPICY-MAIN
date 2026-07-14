#!/usr/bin/env node
// Diff-based upload of src/frontend/dist to the frontend asset canister.
// Skips unchanged files (sha256 match) to save cycles and time.
//
// Usage:
//   node scripts/upload-frontend.mjs \
//     --network      local|ic \
//     --canister     <frontend_canister_id> \
//     [--identity-name  ic_deploy] \
//     [--force]          upload everything (ignore hashes) \
//     [--no-prune]       skip deleting on-canister paths missing from dist

import { createHash } from 'crypto';
import { readdir, readFile } from 'fs/promises';
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
  return !v || v.startsWith('--') ? true : v;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
function required(name) {
  const v = arg(name);
  if (v === undefined || v === true) {
    console.error(`ERROR: --${name} is required`);
    process.exit(1);
  }
  return v;
}

const network = required('network');
const canisterId = required('canister');
const identityName = arg('identity-name') ?? 'ic_deploy';
const identityPath =
  arg('identity-path') ??
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`;
const force = hasFlag('force');
const prune = !hasFlag('no-prune');

const DIST_DIR = join(__dirname, '..', 'src', 'frontend', 'dist');
const BATCH = 20;
const DEL_BATCH = 100;

function contentType(file) {
  const ext = extname(file).toLowerCase();
  const map = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.txt': 'text/plain',
    '.webmanifest': 'application/manifest+json',
  };
  return map[ext] ?? 'application/octet-stream';
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await collectFiles(full)));
    else files.push(full);
  }
  return files;
}

function assetKey(rel) {
  return '/' + rel.replace(/\\/g, '/');
}

function keyParts(rel) {
  const norm = rel.replace(/\\/g, '/');
  const parts = norm.split('/');
  const fileName = parts.pop();
  const path = parts.length > 0 ? '/' + parts.join('/') : '';
  return { path, fileName, key: assetKey(norm) };
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha256Bytes(bytes) {
  return new Uint8Array(createHash('sha256').update(bytes).digest());
}

function encodingHashHex(encoding) {
  const raw = encoding?.sha256?.[0];
  if (!raw) return null;
  return Buffer.from(raw).toString('hex');
}

function cacheHeaders(rel) {
  const isHashed = rel.replace(/\\/g, '/').startsWith('assets/');
  return [
    [
      'Cache-Control',
      isHashed
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate',
    ],
  ];
}

async function buildLocalManifest(distDir) {
  const paths = await collectFiles(distDir);
  const entries = [];
  for (const fullPath of paths) {
    const bytes = await readFile(fullPath);
    const rel = relative(distDir, fullPath);
    const { path, fileName, key } = keyParts(rel);
    entries.push({
      fullPath,
      rel,
      path,
      fileName,
      key,
      bytes,
      hashHex: sha256Hex(bytes),
      hashBytes: sha256Bytes(bytes),
      size: bytes.length,
    });
  }
  return entries;
}

function buildRemoteIndex(existingAssets) {
  const index = new Map();
  for (const asset of existingAssets) {
    const enc =
      asset.encodings?.find((e) => e.content_encoding === 'identity') ??
      asset.encodings?.[0];
    if (!enc) continue;
    index.set(asset.key, {
      hashHex: encodingHashHex(enc),
      size: Number(enc.length),
      contentType: asset.content_type,
    });
  }
  return index;
}

function isBackendManagedShareKey(key) {
  // Backend publishSlicerSharePage() uploads crawler HTML under /s/slicer/{principal}/index.html.
  // Never prune — diff upload would delete OG share pages and can break certification on the path.
  return /^\/s\/slicer\/[^/]+\/index\.html$/.test(key);
}

function classify(localEntries, remoteIndex, { forceAll, doPrune }) {
  const localKeys = new Set(localEntries.map((e) => e.key));
  const toUpload = [];
  const toSkip = [];
  const toPrune = [];

  if (forceAll) {
    return {
      toUpload: localEntries,
      toSkip: [],
      toPrune: doPrune ? [...remoteIndex.keys()] : [],
    };
  }

  for (const entry of localEntries) {
    const remote = remoteIndex.get(entry.key);
    if (
      remote &&
      remote.hashHex &&
      remote.hashHex === entry.hashHex &&
      remote.size === entry.size
    ) {
      toSkip.push(entry);
    } else {
      toUpload.push(entry);
    }
  }

  if (doPrune) {
    for (const key of remoteIndex.keys()) {
      if (!localKeys.has(key) && !isBackendManagedShareKey(key)) {
        toPrune.push(key);
      }
    }
  }

  return { toUpload, toSkip, toPrune };
}

async function deleteKeys(assetManager, keys, label) {
  if (keys.length === 0) return;
  console.log(`${label}: ${keys.length} asset(s)…`);
  for (let i = 0; i < keys.length; i += DEL_BATCH) {
    const delBatch = assetManager.batch();
    for (const key of keys.slice(i, i + DEL_BATCH)) delBatch.delete(key);
    await delBatch.commit();
  }
}

async function uploadEntries(assetManager, entries) {
  if (entries.length === 0) return;
  let done = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH);
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const freshBatch = assetManager.batch();
        for (const entry of chunk) {
          await freshBatch.store(new Uint8Array(entry.bytes), {
            path: entry.path,
            fileName: entry.fileName,
            contentType: contentType(entry.fullPath),
            sha256: entry.hashBytes,
            headers: cacheHeaders(entry.rel),
          });
        }
        await freshBatch.commit();
        break;
      } catch (e) {
        const msg = String(e?.message ?? e);
        if (msg.includes('asset already exists')) {
          try {
            const cleanup = assetManager.batch();
            for (const entry of chunk) cleanup.delete(entry.key);
            await cleanup.commit();
            console.warn(`  Cleared conflicting keys for batch @${i}, retrying…`);
          } catch (cleanupErr) {
            console.warn(
              '  Cleanup after conflict failed:',
              cleanupErr?.message ?? cleanupErr,
            );
          }
        }
        if (attempt >= 5) throw e;
        const delay = Math.min(2000 * 2 ** attempt, 30000);
        console.warn(`  Batch failed (attempt ${attempt}), retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    done += chunk.length;
    console.log(`  Uploaded ${done}/${entries.length} changed files`);
  }
}

async function enableSpaAlias(agent, canister) {
  console.log('\nEnabling SPA aliasing on /index.html…');
  const setAssetPropertiesIDL = IDL.Service({
    set_asset_properties: IDL.Func(
      [
        IDL.Record({
          key: IDL.Text,
          max_age: IDL.Opt(IDL.Opt(IDL.Nat64)),
          headers: IDL.Opt(IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)))),
          allow_raw_access: IDL.Opt(IDL.Opt(IDL.Bool)),
          is_aliased: IDL.Opt(IDL.Opt(IDL.Bool)),
        }),
      ],
      [],
      [],
    ),
  });
  const rawActor = Actor.createActor(() => setAssetPropertiesIDL, {
    agent,
    canisterId: canister,
  });
  await rawActor.set_asset_properties({
    key: '/index.html',
    max_age: [],
    headers: [],
    allow_raw_access: [],
    is_aliased: [[true]],
  });
  console.log('  ✓ /index.html is_aliased = true');
}

const pem = readFileSync(identityPath, 'utf8');
const identity = Secp256k1KeyIdentity.fromPem(pem);

const host = network === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app';
const agent = await HttpAgent.create({
  identity,
  host,
  shouldFetchRootKey: network === 'local',
});

const assetManager = new AssetManager({ canisterId, agent });

console.log(`Mode: ${force ? 'FORCE (full upload)' : 'diff (sha256)'}`);
console.log(`Prune stale assets: ${prune ? 'yes' : 'no (--no-prune)'}`);

const localEntries = await buildLocalManifest(DIST_DIR);
console.log(`Local dist files: ${localEntries.length}`);

console.log('Listing on-canister assets…');
const existingAssets = await assetManager.list();
const remoteIndex = buildRemoteIndex(existingAssets);
console.log(`On-canister assets: ${remoteIndex.size}`);

const { toUpload, toSkip, toPrune } = classify(localEntries, remoteIndex, {
  forceAll: force,
  doPrune: prune,
});

// Changed paths at the same key need delete-before-store when hash differs.
const changedKeys = new Set(
  toUpload.filter((e) => remoteIndex.has(e.key)).map((e) => e.key),
);
const pruneKeys = [...new Set([...toPrune, ...changedKeys])];

console.log('\nPlan:');
console.log(`  Upload (new/changed): ${toUpload.length}`);
console.log(`  Skip (unchanged):     ${toSkip.length}`);
console.log(`  Prune (removed):      ${toPrune.length}`);
if (changedKeys.size > 0) {
  console.log(`  Replace-in-place:     ${changedKeys.size} (delete + re-upload)`);
}

await deleteKeys(assetManager, pruneKeys, '\nDeleting stale/changed assets');
await uploadEntries(assetManager, toUpload);

console.log('\n── Summary ──');
console.log(`  Uploaded: ${toUpload.length}`);
console.log(`  Skipped:  ${toSkip.length} (unchanged)`);
console.log(`  Pruned:   ${toPrune.length}`);

await enableSpaAlias(agent, canisterId);

console.log(`\n✅ Done. Live at: https://${canisterId}.icp0.io`);

#!/usr/bin/env node
// Re-upload SPA index.html at /s/slicer/{principal}/index.html to fix certification
// after prune removed backend-published share HTML (503 on share URLs).
//
// Usage:
//   node scripts/repair-slicer-share-spa.mjs \
//     --network ic \
//     --canister 7rukv-hqaaa-aaaao-ba6ma-cai \
//     --principal iy7fi-yycsf-p733h-mr2sx-veqqx-tsv3h-bj64h-d6ya4-naalr-bbi54-5ae \
//     [--identity-name ic_deploy_plain]

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { HttpAgent } from '@dfinity/agent';
import { AssetManager } from '@dfinity/assets';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return !v || v.startsWith('--') ? true : v;
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
const principal = required('principal');
const identityName = arg('identity-name') ?? 'ic_deploy_plain';
const identityPath =
  arg('identity-path') ??
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`;

const indexPath = join(__dirname, '..', 'src', 'frontend', 'dist', 'index.html');
const bytes = readFileSync(indexPath);
const hashBytes = new Uint8Array(createHash('sha256').update(bytes).digest());
const key = `/s/slicer/${principal}/index.html`;

const pem = readFileSync(identityPath, 'utf8');
const identity = Secp256k1KeyIdentity.fromPem(pem);
const host = network === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app';
const agent = await HttpAgent.create({
  identity,
  host,
  shouldFetchRootKey: network === 'local',
});
const assetManager = new AssetManager({ canisterId, agent });

console.log(`Repairing ${key} (${bytes.length} bytes)…`);

try {
  const cleanup = assetManager.batch();
  cleanup.delete(key);
  await cleanup.commit();
} catch {
  // key may not exist
}

const batch = assetManager.batch();
await batch.store(new Uint8Array(bytes), {
  path: `/s/slicer/${principal}`,
  fileName: 'index.html',
  contentType: 'text/html',
  sha256: hashBytes,
  headers: [['Cache-Control', 'public, max-age=0, must-revalidate']],
});
await batch.commit();

console.log(`✅ ${key} restored — SPA share route should certify again.`);

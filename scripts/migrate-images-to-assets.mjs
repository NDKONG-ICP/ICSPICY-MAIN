#!/usr/bin/env node
// One-time migration: copy user-upload images from backend heap to uploads asset canister.
//
// Usage:
//   node scripts/migrate-images-to-assets.mjs \
//     --network ic \
//     --backend   ghxmp-xiaaa-aaaao-ba4sq-cai \
//     --uploads   <uploads_canister_id> \
//     [--identity-name ic_deploy] \
//     [--dry-run]

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { AssetManager } from '@dfinity/assets';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Principal } from '@dfinity/principal';

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
const backendId = required('backend');
const uploadsId = required('uploads');
const dryRun = arg('dry-run') === true;
const identityName = arg('identity-name') ?? 'ic_deploy';
const identityPath =
  arg('identity-path') ??
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`;

const USER_PREFIXES = [
  'community-images/',
  'avatars/',
  'nims-photos/',
  'shop-listings/',
];

function isUserUploadPath(path) {
  return USER_PREFIXES.some((p) => path.startsWith(p));
}

function assetKey(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

const backendIdl = IDL.Service({
  listArtworkFiles: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))], ['query']),
  getCommunityImageFile: IDL.Func(
    [IDL.Text],
    [IDL.Opt(IDL.Record({ data: IDL.Vec(IDL.Nat8), mime_type: IDL.Text }))],
    ['query'],
  ),
  getAvatarFile: IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Nat8))], ['query']),
  getNimsPhotoFile: IDL.Func(
    [IDL.Text],
    [IDL.Opt(IDL.Record({ data: IDL.Vec(IDL.Nat8), mime_type: IDL.Text }))],
    ['query'],
  ),
  getShopListingFile: IDL.Func(
    [IDL.Text],
    [IDL.Opt(IDL.Record({ data: IDL.Vec(IDL.Nat8), mime_type: IDL.Text }))],
    ['query'],
  ),
});

const pem = readFileSync(identityPath, 'utf8');
const identity = Secp256k1KeyIdentity.fromPem(pem);
const host = network === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app';
const agent = await HttpAgent.create({
  identity,
  host,
  shouldFetchRootKey: network === 'local',
});

const backend = Actor.createActor(() => backendIdl, {
  agent,
  canisterId: backendId,
});

const assetManager = new AssetManager({ canisterId: uploadsId, agent });

async function fetchBytes(path) {
  if (path.startsWith('avatars/')) {
    const res = await backend.getAvatarFile(path);
    if (!res || res.length === 0) return null;
    return { data: new Uint8Array(res[0]), mime: 'image/jpeg' };
  }
  if (path.startsWith('community-images/')) {
    const res = await backend.getCommunityImageFile(path);
    if (!res || res.length === 0) return null;
    const file = res[0];
    return { data: new Uint8Array(file.data), mime: file.mime_type };
  }
  if (path.startsWith('nims-photos/')) {
    const res = await backend.getNimsPhotoFile(path);
    if (!res || res.length === 0) return null;
    const file = res[0];
    return { data: new Uint8Array(file.data), mime: file.mime_type };
  }
  if (path.startsWith('shop-listings/')) {
    const res = await backend.getShopListingFile(path);
    if (!res || res.length === 0) return null;
    const file = res[0];
    return { data: new Uint8Array(file.data), mime: file.mime_type };
  }
  return null;
}

const listed = await backend.listArtworkFiles();
const paths = listed
  .map(([path]) => path)
  .filter(isUserUploadPath);

console.log(`Found ${paths.length} user-upload paths in backend storedFiles`);

const existing = new Set((await assetManager.list()).map((a) => a.key));
let migrated = 0;
let skipped = 0;
let failed = 0;

for (const path of paths) {
  const key = assetKey(path);
  if (existing.has(key)) {
    console.log(`  skip (exists): ${path}`);
    skipped += 1;
    continue;
  }

  const file = await fetchBytes(path);
  if (!file) {
    console.warn(`  skip (no bytes): ${path}`);
    skipped += 1;
    continue;
  }

  if (dryRun) {
    console.log(`  dry-run: would upload ${path} (${file.data.length} bytes)`);
    migrated += 1;
    continue;
  }

  try {
    const parts = key.split('/').filter(Boolean);
    const fileName = parts.pop();
    const path = parts.length > 0 ? `/${parts.join('/')}` : '';
    await assetManager.store(file.data, {
      path,
      fileName,
      contentType: file.mime || 'application/octet-stream',
      headers: [['Cache-Control', 'public, max-age=31536000, immutable']],
    });
    console.log(`  uploaded: ${path}`);
    migrated += 1;
  } catch (e) {
    console.error(`  FAILED: ${path}`, e);
    failed += 1;
  }
}

console.log(
  `\nDone. migrated=${migrated} skipped=${skipped} failed=${failed}${dryRun ? ' (dry-run)' : ''}`,
);
console.log(`Uploads canister: https://${uploadsId}.raw.icp0.io/`);

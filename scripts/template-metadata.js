#!/usr/bin/env node
// One-shot pre-upload script: replaces all placeholders in nft_collection/metadata/*.json
// and writes templated output to a new directory. Originals are never modified.
//
// Usage:
//   node scripts/template-metadata.js \
//     --nft-assets-id <canister_id> \
//     --backend-id    <canister_id> \
//     --creator       <principal>   \
//     --collection-id icspicy-nft-matrix-v1 \
//     --input-dir     nft_collection/metadata \
//     --output-dir    nft_collection_templated/metadata \
//     [--dry-run]
//
// --dry-run: prints first file before/after to stdout, writes nothing.
//   After a full run, all output files are scanned for surviving placeholders;
//   any found cause a non-zero exit.

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

const nftAssetsId  = required('nft-assets-id');
const backendId    = required('backend-id');
const creator      = required('creator');
const collectionId = required('collection-id');
const inputDir     = required('input-dir');
const outputDir    = required('output-dir');
const dryRun       = arg('dry-run') !== undefined;

const files = (await readdir(inputDir)).filter(f => /^nft_\d+\.json$/.test(f));

if (files.length === 0) {
  console.error(`ERROR: no nft_*.json files found in ${inputDir}`);
  process.exit(1);
}

console.log(`Found ${files.length} files in ${inputDir}`);
if (dryRun) console.log('DRY RUN — printing first file only, no files written');

if (!dryRun) await mkdir(outputDir, { recursive: true });

let processed = 0;
let skipped = 0;

for (const file of files) {
  const m = file.match(/^nft_(\d+)\.json$/);
  if (!m) { skipped++; continue; }
  const nftNum = m[1];

  const original = await readFile(join(inputDir, file), 'utf8');
  let text = original;

  // Replace full image URL before replacing the bare YOUR_ICP_CANISTER_ID substring.
  // Originals: https://YOUR_ICP_CANISTER_ID.raw.ic0.app/N.png  (bare number, no nft_ prefix)
  // Target:    https://<id>.icp0.io/images/nft_N.png
  text = text.replace(
    `https://YOUR_ICP_CANISTER_ID.raw.ic0.app/${nftNum}.png`,
    `https://${nftAssetsId}.icp0.io/images/nft_${nftNum}.png`,
  );

  text = text.replaceAll('YOUR_ICP_CANISTER_ID', nftAssetsId);
  text = text.replaceAll('YOUR_CANISTER_ID',     backendId);
  text = text.replaceAll('YOUR_PRINCIPAL_ID',    creator);
  text = text.replaceAll('YOUR_COLLECTION_ID',   collectionId);
  text = text.replaceAll('The NFT Matrix',       'IC SPICY');
  text = text.replaceAll('raw.ic0.app',          'icp0.io');  // catch-all for any remaining

  // Insert external_url (after image, before attributes) so wallets/marketplaces
  // have a clickable link as soon as icspicy.app/nft/{N} goes live in Phase 3.6.
  text = text.replace(
    '    "attributes":',
    `    "external_url": "https://icspicy.app/nft/${nftNum}",\n    "attributes":`,
  );

  if (dryRun) {
    console.log(`\n--- ${file} (original)`);
    console.log(original.slice(0, 600));
    console.log(`\n+++ ${file} (templated)`);
    console.log(text.slice(0, 600));
    process.exit(0);
  }

  await writeFile(join(outputDir, file), text, 'utf8');
  processed++;
  if (processed % 100 === 0) console.log(`[${processed}/${files.length}] processed`);
}

if (skipped > 0) console.warn(`Skipped ${skipped} files with unexpected names`);
console.log(`Done: ${processed}/${files.length} files → ${outputDir}`);

// Verification pass: scan every output file for surviving placeholders.
// Any found means a templating bug; exit non-zero so callers (CI, scripts) can catch it.
const PLACEHOLDERS = [
  'YOUR_ICP_CANISTER_ID',
  'YOUR_CANISTER_ID',
  'YOUR_PRINCIPAL_ID',
  'YOUR_COLLECTION_ID',
  'raw.ic0.app',
  'The NFT Matrix',
];

console.log('Verifying no placeholders remain in output...');
let foundIssues = 0;
for (const file of files) {
  const m = file.match(/^nft_(\d+)\.json$/);
  if (!m) continue;
  const content = await readFile(join(outputDir, file), 'utf8');
  for (const p of PLACEHOLDERS) {
    if (content.includes(p)) {
      console.error(`  ERROR: ${file} still contains "${p}"`);
      foundIssues++;
    }
  }
}

if (foundIssues > 0) {
  console.error(`\nTemplating verification FAILED: ${foundIssues} issue(s) found`);
  process.exit(1);
}
console.log('Verification passed: no placeholders remain in output');

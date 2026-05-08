#!/usr/bin/env node
// Uploads a GGUF model file to the llama_cpp canister in 1.5 MB chunks.
//
// Prerequisites:
//   - llama_cpp canister is deployed and healthy
//   - Enough cycles (recommend 20T before starting)
//   - Model file downloaded from HuggingFace
//
// Usage:
//   node scripts/upload-deepseek-model.mjs \
//     --network      local|ic \
//     --canister     <llama_cpp_canister_id> \
//     --model        /path/to/deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf \
//     [--dest        /models/deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf] \
//     [--identity-name  ic_deploy] \
//     [--identity-path  /path/to/identity.pem] \
//     [--chunk-size  1500000]
//
// After upload, call load_model manually:
//   dfx canister --network ic call llama_cpp load_model '(record {
//     args = vec {
//       "-m"; "/models/deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf";
//       "--ctx-size"; "512"; "--temp"; "0.1"; "--seed"; "42"
//     }
//   })'

import { readFileSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ── Args ─────────────────────────────────────────────────────────────────────

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return (!v || v.startsWith('--')) ? true : v;
}
function required(name) {
  const v = arg(name);
  if (!v || v === true) { console.error(`ERROR: --${name} is required`); process.exit(1); }
  return v;
}

const network      = required('network');
const canisterId   = required('canister');
const modelFile    = required('model');
const destPath     = arg('dest') ?? '/models/deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf';
const identityName = arg('identity-name') ?? 'ic_deploy';
const identityPath = arg('identity-path') ??
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`;
const CHUNK_SIZE   = parseInt(arg('chunk-size') ?? '1500000', 10);

// ── Validate inputs ───────────────────────────────────────────────────────────

if (!existsSync(modelFile)) {
  console.error(`ERROR: Model file not found: ${modelFile}`);
  process.exit(1);
}
const modelSize = statSync(modelFile).size;
console.log(`Model file : ${modelFile}`);
console.log(`File size  : ${(modelSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`Dest path  : ${destPath}`);
console.log(`Canister   : ${canisterId} (${network})`);
console.log(`Chunk size : ${(CHUNK_SIZE / 1024).toFixed(0)} KB`);
console.log('');

// ── Candid IDL for llama_cpp (upload methods only) ────────────────────────────

const llamaCppIdlFactory = ({ IDL }) => {
  const ApiError = IDL.Variant({ Other: IDL.Text, StatusCode: IDL.Nat16 });

  const FileUploadInputRecord = IDL.Record({
    filename  : IDL.Text,
    chunk     : IDL.Vec(IDL.Nat8),
    chunksize : IDL.Nat64,
    offset    : IDL.Nat64,
  });
  const FileUploadRecord = IDL.Record({
    filename   : IDL.Text,
    filesize   : IDL.Nat64,
    filesha256 : IDL.Text,
  });
  const FileUploadRecordResult = IDL.Variant({
    Ok : FileUploadRecord,
    Err: ApiError,
  });

  const FileDetailsInputRecord  = IDL.Record({ filename: IDL.Text });
  const FileDetailsRecord       = IDL.Record({ filename: IDL.Text, filesize: IDL.Nat64, filesha256: IDL.Text });
  const FileDetailsRecordResult = IDL.Variant({ Ok: FileDetailsRecord, Err: ApiError });

  const StatusCodeRecord       = IDL.Record({ status_code: IDL.Nat16 });
  const StatusCodeRecordResult = IDL.Variant({ Ok: StatusCodeRecord, Err: ApiError });

  const InputRecord        = IDL.Record({ args: IDL.Vec(IDL.Text) });
  const RunOutputRecord    = IDL.Record({
    status_code      : IDL.Nat16,
    output           : IDL.Text,
    conversation     : IDL.Text,
    error            : IDL.Text,
    prompt_remaining : IDL.Text,
    generated_eog    : IDL.Bool,
  });
  const OutputRecordResult = IDL.Variant({ Ok: RunOutputRecord, Err: RunOutputRecord });

  return IDL.Service({
    health               : IDL.Func([], [StatusCodeRecordResult], ['query']),
    file_upload_chunk    : IDL.Func([FileUploadInputRecord], [FileUploadRecordResult], []),
    uploaded_file_details: IDL.Func([FileDetailsInputRecord], [FileDetailsRecordResult], ['query']),
    load_model           : IDL.Func([InputRecord], [OutputRecordResult], []),
    set_access           : IDL.Func(
      [IDL.Record({ level: IDL.Nat16 })],
      [IDL.Variant({ Ok: IDL.Record({ level: IDL.Nat16, explanation: IDL.Text }), Err: ApiError })],
      [],
    ),
  });
};

// ── Setup agent ───────────────────────────────────────────────────────────────

const pem = readFileSync(identityPath, 'utf8');
const identity = Secp256k1KeyIdentity.fromPem(pem);
const host = network === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app';
const agent = await HttpAgent.create({ identity, host, shouldFetchRootKey: network === 'local' });
const actor = Actor.createActor(llamaCppIdlFactory, { agent, canisterId });

// ── Health check ───────────────────────────────────────────────────────────────

console.log('Checking llama_cpp health…');
const health = await actor.health();
if ('Err' in health) {
  console.error('llama_cpp canister not healthy:', health.Err);
  process.exit(1);
}
console.log(`Health OK (status ${health.Ok.status_code})\n`);

// ── Check for existing upload (resume) ───────────────────────────────────────

let resumeOffset = 0;
try {
  const existing = await actor.uploaded_file_details({ filename: destPath });
  if ('Ok' in existing) {
    const existingSize = Number(existing.Ok.filesize);
    if (existingSize === modelSize) {
      console.log(`File already fully uploaded (${(existingSize / 1024 / 1024).toFixed(1)} MB). Skipping upload.`);
      console.log('\nNext step: call load_model to load the model into memory.');
      process.exit(0);
    }
    if (existingSize > 0 && existingSize < modelSize) {
      // Resume from where we left off, aligned to chunk boundary
      resumeOffset = Math.floor(existingSize / CHUNK_SIZE) * CHUNK_SIZE;
      console.log(`Resuming upload from offset ${(resumeOffset / 1024 / 1024).toFixed(1)} MB`);
    }
  }
} catch {
  // No existing file — start from beginning
}

// ── Read model file ────────────────────────────────────────────────────────────

console.log('Reading model file into memory…');
const modelBuffer = readFileSync(modelFile);
console.log(`Read ${(modelBuffer.length / 1024 / 1024).toFixed(1)} MB\n`);

// ── Upload in chunks ──────────────────────────────────────────────────────────

const totalChunks = Math.ceil(modelSize / CHUNK_SIZE);
const startChunk  = Math.floor(resumeOffset / CHUNK_SIZE);
let lastProgressPrint = Date.now();

console.log(`Uploading ${totalChunks} chunks (${startChunk} already done)…`);

for (let i = startChunk; i < totalChunks; i++) {
  const offset    = i * CHUNK_SIZE;
  const chunkData = modelBuffer.subarray(offset, Math.min(offset + CHUNK_SIZE, modelSize));
  const chunkArr  = Array.from(chunkData); // Uint8Array → number[]

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const result = await actor.file_upload_chunk({
        filename  : destPath,
        chunk     : chunkArr,
        chunksize : BigInt(chunkArr.length),
        offset    : BigInt(offset),
      });

      if ('Err' in result) {
        throw new Error(`Canister error: ${JSON.stringify(result.Err)}`);
      }

      // Progress print every 5 seconds
      if (Date.now() - lastProgressPrint > 5000) {
        const pct = (((i + 1) / totalChunks) * 100).toFixed(1);
        const uploadedMB = ((offset + chunkArr.length) / 1024 / 1024).toFixed(1);
        console.log(`  Chunk ${i + 1}/${totalChunks} (${pct}%) — ${uploadedMB} MB uploaded`);
        lastProgressPrint = Date.now();
      }
      break; // success

    } catch (err) {
      if (attempt === 5) {
        console.error(`\nFailed chunk ${i} after 5 attempts:`, err.message);
        process.exit(1);
      }
      console.warn(`  Chunk ${i} attempt ${attempt} failed, retrying…`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

// ── Verify upload ─────────────────────────────────────────────────────────────

console.log('\nVerifying upload…');
const details = await actor.uploaded_file_details({ filename: destPath });
if ('Err' in details) {
  console.error('Failed to get upload details:', details.Err);
  process.exit(1);
}

const uploadedSize   = Number(details.Ok.filesize);
const uploadedSha256 = details.Ok.filesha256;

// Compute expected SHA-256
const localSha256 = createHash('sha256').update(modelBuffer).digest('hex');

console.log(`Uploaded size  : ${(uploadedSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`Canister SHA256: ${uploadedSha256}`);
console.log(`Local SHA256   : ${localSha256}`);

if (uploadedSize !== modelSize) {
  console.error(`ERROR: Size mismatch — expected ${modelSize}, got ${uploadedSize}`);
  process.exit(1);
}
if (uploadedSha256 !== localSha256) {
  console.error('ERROR: SHA-256 mismatch — upload may be corrupt');
  process.exit(1);
}

console.log('\n✅ Upload verified successfully!');
console.log('\nNext steps:');
console.log('1. Open llama_cpp access (from spicy_ai_canister admin panel):');
console.log('     openLlamaCppAccess()');
console.log('2. Load the model (from spicy_ai_canister admin panel):');
console.log('     configureMaxTokens(1n, 3n)');
console.log('3. Enable spicy_ai_canister:');
console.log('     setEnabled(true)');
console.log('4. Run a smoke test:');
console.log('     node scripts/spicyai-deepseek-smoke.mjs --network ic');

#!/usr/bin/env node
// generate-claim-qrs.mjs
//
// Generates QR code PNGs from a pre-exported claim token CSV.
//
// Workflow:
//   1. Admin calls generateClaimTokens([tokenIds]) on the canister via dfx.
//   2. Admin exports the result to a CSV: token,tokenId
//   3. This script reads that CSV, generates QR codes, and writes:
//        output-dir/qr/<token>.png          — QR code image (400px)
//        output-dir/claims-with-urls.csv    — enriched: token,tokenId,url,qr_filename
//
// Usage:
//   node scripts/generate-claim-qrs.mjs \
//     --input-csv labels/batch-001/tokens.csv \
//     --output-dir labels/batch-001 \
//     [--domain icspicy.app] \
//     [--dry-run]

import fs   from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

// ── CLI argument parsing ───────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") { args.dryRun = true; continue; }
    if (a.startsWith("--")) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = argv[++i] ?? true;
    }
  }
  return args;
}

const args   = parseArgs(process.argv);
const csv    = args.inputCsv;
const outDir = args.outputDir;
const domain = args.domain ?? "icspicy.app";
const dryRun = args.dryRun ?? false;

if (!csv || !outDir) {
  console.error("Usage: node generate-claim-qrs.mjs --input-csv <file> --output-dir <dir> [--domain <host>] [--dry-run]");
  process.exit(1);
}

// ── Read + parse the input CSV ────────────────────────────────────────────────

const raw = fs.readFileSync(csv, "utf8").trim().split("\n");
// Skip header row (token,tokenId)
const rows = raw.slice(1).map((line) => {
  const [token, tokenId] = line.split(",").map((s) => s.trim());
  if (!token || !tokenId) throw new Error(`Malformed CSV row: ${line}`);
  return { token, tokenId };
});

if (rows.length === 0) {
  console.error("CSV has no data rows.");
  process.exit(1);
}

console.log(`Reading ${rows.length} tokens from ${csv}`);

// ── Dry-run preview ───────────────────────────────────────────────────────────

if (dryRun) {
  console.log("\n[dry-run] First 3 entries:");
  for (const { token, tokenId } of rows.slice(0, 3)) {
    console.log(`  token=${token}  tokenId=${tokenId}  url=https://${domain}/claim/${token}`);
  }
  console.log(`\n[dry-run] Would write ${rows.length} QR PNGs + claims-with-urls.csv to ${outDir}`);
  process.exit(0);
}

// ── Create output directories ─────────────────────────────────────────────────

const qrDir = path.join(outDir, "qr");
fs.mkdirSync(qrDir, { recursive: true });

// ── QR generation options ─────────────────────────────────────────────────────

const QR_OPTS = {
  width: 400,
  margin: 2,
  errorCorrectionLevel: "M",
  color: { dark: "#000000", light: "#FFFFFF" },
};

// ── Generate QR codes + build enriched CSV rows ───────────────────────────────

const enriched = ["token,tokenId,url,qr_filename"];
let done = 0;

for (const { token, tokenId } of rows) {
  const url         = `https://${domain}/claim/${token}`;
  const qrFilename  = `${token}.png`;
  const qrPath      = path.join(qrDir, qrFilename);

  await QRCode.toFile(qrPath, url, QR_OPTS);
  enriched.push(`${token},${tokenId},${url},qr/${qrFilename}`);
  done++;
  if (done % 50 === 0) process.stdout.write(`  ${done}/${rows.length}…\n`);
}

// ── Write enriched CSV ────────────────────────────────────────────────────────

const outCsv = path.join(outDir, "claims-with-urls.csv");
fs.writeFileSync(outCsv, enriched.join("\n") + "\n");

console.log(`\nDone: ${done} QR codes written to ${qrDir}/`);
console.log(`Enriched CSV: ${outCsv}`);

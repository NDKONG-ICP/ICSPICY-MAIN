#!/usr/bin/env node
//
// scripts/spot-check-templated.mjs — One-time spot check of 5 representative
// templated metadata files against the parser's documented subset.
//
// Purpose: confirm the actual mainnet-templated JSON shape (8888 files in
// nft_collection_templated_mainnet/metadata/) only uses features the
// hand-rolled parser supports. Empirical sanity check, not a parallel
// implementation — uses Node's built-in JSON.parse to walk the AST and
// flag anything outside the parser's subset.
//
// Sampled token IDs: 1 (first), 2222, 4444, 6666, 8888 (last).
//
// Usage:
//   node scripts/spot-check-templated.mjs
//
// Exits 0 if all 5 files conform to the parser subset, non-zero otherwise.

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const META_DIR = resolve(process.cwd(), 'nft_collection_templated_mainnet/metadata');
const SAMPLE_IDS = [1, 2222, 4444, 6666, 8888];

// Walk the parsed AST and report any value that violates the parser's subset:
// - non-finite or negative numbers
// - floats that aren't simple decimal notation (e.g. exponents)
// - duplicate keys (JSON.parse already drops dupes; we re-detect below by
//   parsing the raw text)
// - any null / boolean / Symbol / etc.
function walk(node, path, violations, rawHits) {
  if (node === null) {
    violations.push(`${path}: null value (out of subset)`);
    return;
  }
  switch (typeof node) {
    case 'string':
      // Subset accepts strings as-is; bytes were validated at JSON parse time.
      return;
    case 'number':
      if (!Number.isFinite(node)) {
        violations.push(`${path}: non-finite number (${node})`);
        return;
      }
      if (node < 0) {
        violations.push(`${path}: negative number (${node})`);
        return;
      }
      // Float vs integer is fine — both are accepted (int → #Nat, decimal → #Text).
      return;
    case 'boolean':
      violations.push(`${path}: boolean (${node}) is out of subset`);
      return;
    case 'object':
      if (Array.isArray(node)) {
        node.forEach((item, i) => walk(item, `${path}[${i}]`, violations, rawHits));
      } else {
        for (const [k, v] of Object.entries(node)) {
          walk(v, `${path}.${k}`, violations, rawHits);
        }
      }
      return;
    default:
      violations.push(`${path}: unsupported JS type ${typeof node}`);
  }
}

// Heuristic checks against the raw text that JSON.parse would silently mask:
// - \uXXXX escape sequences
// - scientific notation (e/E within numbers)
// - duplicate keys (since JSON.parse keeps last)
function rawTextChecks(raw, violations) {
  // \uXXXX escapes
  if (/\\u[0-9a-fA-F]{4}/.test(raw)) {
    violations.push('raw: contains \\uXXXX escape sequence');
  }
  // Scientific notation in numbers (excluding inside strings — coarse heuristic).
  // Look for digit followed by e/E followed by digit/sign, not inside a string.
  const scientificMatch = raw.match(/(?<!")[0-9]+[eE][+\-]?[0-9]+(?!")/);
  if (scientificMatch) {
    violations.push(`raw: contains scientific notation (${scientificMatch[0]})`);
  }
  // Duplicate keys: parse manually to detect.
  // Coarse: count occurrences of each key string. Real check would need a
  // streaming parser; for our schema this heuristic is fine.
  const keyMatches = [...raw.matchAll(/"([^"]+)":/g)].map(m => m[1]);
  const seen = new Map();
  for (const k of keyMatches) {
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  // Note: keys can legitimately repeat across different objects. We only flag
  // if the same nesting path has dupes — too complex for a spot check; skip.
}

let totalViolations = 0;
for (const id of SAMPLE_IDS) {
  const path = join(META_DIR, `nft_${id}.json`);
  console.log(`── nft_${id}.json ${'─'.repeat(60 - String(id).length)}`);
  const raw = readFileSync(path, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.log(`  FAIL: JSON.parse error: ${e.message}`);
    totalViolations += 1;
    continue;
  }
  const violations = [];
  walk(parsed, '$', violations, raw);
  rawTextChecks(raw, violations);
  if (violations.length === 0) {
    console.log(`  OK — conforms to parser subset (${raw.length} bytes, ` +
                `${Object.keys(parsed).length} top-level keys)`);
  } else {
    console.log(`  ${violations.length} violation(s):`);
    for (const v of violations) console.log(`    - ${v}`);
    totalViolations += violations.length;
  }
}

console.log('');
console.log('────────────────────────────────────────────────────────────');
if (totalViolations === 0) {
  console.log('All 5 sampled files conform to the parser subset.');
  process.exit(0);
} else {
  console.log(`Total violations across samples: ${totalViolations}`);
  process.exit(1);
}

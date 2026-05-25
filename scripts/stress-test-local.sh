#!/usr/bin/env bash
# Deploy backend locally and run the full IC SPICY stress test suite.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Deploying backend to local replica…"
dfx deploy --network local backend

echo "==> Running stress tests against local backend…"
node scripts/stress-test.mjs --network local --test all

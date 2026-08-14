#!/usr/bin/env bash
# Add backend canister as controller on production canisters so fleet health
# can read canister_status for asset canisters.
#
# Usage (from repo root, ic_deploy identity):
#   DFX_WARNING=-mainnet_plaintext_identity ./scripts/add-backend-fleet-controllers.sh --network ic
#
set -euo pipefail

NETWORK="${2:-ic}"
BACKEND="ghxmp-xiaaa-aaaao-ba4sq-cai"

# Asset canisters need backend as controller for canister_status probes.
# Motoko services (docs_backend, spicy_ai, weather_mcp) expose getCanisterHealth
# and are probed via #remoteHealthQuery — controller not required for health.
CANISTERS=(
  "7rukv-hqaaa-aaaao-ba6ma-cai"   # frontend
  "gawk3-2qaaa-aaaao-ba4sa-cai"   # nft_assets
  "r53pg-maaaa-aaaao-ba7na-cai"   # uploads
  "pr3bu-6aaaa-aaaao-ba5ba-cai"   # docs_frontend
)

if [[ "${1:-}" != "--network" ]]; then
  echo "Usage: $0 --network ic|local"
  exit 1
fi

echo "Adding backend ${BACKEND} as controller on ${#CANISTERS[@]} canisters (network=${NETWORK})…"
for id in "${CANISTERS[@]}"; do
  echo "  → ${id}"
  DFX_WARNING=-mainnet_plaintext_identity dfx canister --network "$NETWORK" \
    update-settings "$id" --add-controller "$BACKEND"
done
echo "Done. Re-open Admin → System and Refresh fleet health."

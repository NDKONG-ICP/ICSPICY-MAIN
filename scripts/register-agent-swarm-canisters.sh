#!/usr/bin/env bash
# Register dedicated agent canisters in backend swarm fleet (admin dfx identity).
set -euo pipefail

NETWORK="${1:-local}"
BACKEND="${2:-backend}"

register() {
  local name="$1"
  local canister="$2"
  local category="$3"
  local agent_kind="$4"
  local id
  id="$(dfx canister id "$canister" --network "$NETWORK")"
  echo "Registering $name ($id)…"
  dfx canister call "$BACKEND" adminRegisterSwarmCanister "(record {
    name = \"$name\";
    canisterId = \"$id\";
    kind = variant { remoteHealthQuery };
    category = variant { $category };
    agentKind = opt \"$agent_kind\";
    enabled = true;
    autoTopUpEnabled = false;
    thresholdCycles = 500_000_000_000 : nat;
    icpPerTopUpE8s = 100_000_000 : nat;
    maxIcpPerDayE8s = 500_000_000 : nat;
    notes = \"Dedicated agent canister\";
  })" --network "$NETWORK" || true
}

register "Weather Concierge" weather_concierge_canister agent weather_concierge
register "Weather Sentinel" weather_sentinel_canister weather weather_sentinel
register "Fleet Cycles Ops" fleet_cycles_ops_canister workerBridge fleet_cycles_ops
register "Newsletter Agent" newsletter_canister agent newsletter

echo "Done. Attach agent_hub links manually via adminAttachAgentCanister if desired."

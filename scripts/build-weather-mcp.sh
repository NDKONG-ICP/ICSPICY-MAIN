#!/usr/bin/env bash
# Custom build for weather_mcp — isolated moc 0.14.14 + mcp-motoko-sdk (mo:base).
# Root packtool (mo:core / moc 1.x) must not compile this canister.
# Paths may contain spaces ("IC SPICY MAIN") — never word-split package paths.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MCP_DIR="$ROOT/src/weather_mcp"
OUT_WASM="$MCP_DIR/weather_mcp.wasm"
OUT_DID="$MCP_DIR/weather_mcp.did"

cd "$MCP_DIR"
MOC="$(mops toolchain bin moc)"

pkg_args=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  # line format: --package NAME /absolute/path possibly with spaces
  name=$(printf '%s\n' "$line" | awk '{print $2}')
  path=$(printf '%s\n' "$line" | awk '{ $1=""; $2=""; sub(/^ +/,""); print }')
  pkg_args+=(--package "$name" "$path")
done < <(bash "$ROOT/scripts/weather-mcp-sources.sh")

"$MOC" main.mo "${pkg_args[@]}" \
  -o "$OUT_WASM" \
  -c \
  --idl \
  --stable-types \
  --public-metadata candid:service \
  --public-metadata candid:args

if [[ ! -f "$OUT_DID" && -f "$MCP_DIR/main.did" ]]; then
  mv "$MCP_DIR/main.did" "$OUT_DID"
fi

echo "Built $OUT_WASM"
ls -la "$OUT_WASM" "$OUT_DID"

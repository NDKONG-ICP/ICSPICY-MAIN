#!/usr/bin/env bash
# Emit moc --package args for weather_mcp with absolute paths (dfx CWD = project root).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MCP_DIR="$ROOT/src/weather_mcp"
cd "$MCP_DIR"
mops sources | while IFS= read -r line; do
  # --package NAME RELPATH  →  --package NAME ABS
  name=$(printf '%s\n' "$line" | awk '{print $2}')
  rel=$(printf '%s\n' "$line" | awk '{print $3}')
  case "$rel" in
    .mops/*|./.mops/*) printf -- '--package %s %s/%s\n' "$name" "$MCP_DIR" "${rel#./}" ;;
    /*) printf -- '--package %s %s\n' "$name" "$rel" ;;
    *) printf -- '--package %s %s/%s\n' "$name" "$MCP_DIR" "$rel" ;;
  esac
done

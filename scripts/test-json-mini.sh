#!/usr/bin/env bash
#
# scripts/test-json-mini.sh — Path-coverage tests for src/backend/lib/json-mini.mo.
#
# Calls the temporary admin-only _debugParseMetadata method on the deployed
# backend canister. The debug method is removed in the follow-up Phase 3.2
# commit; this script is preserved for re-use (just temporarily re-add the
# method, run, remove again).
#
# Usage:
#   ./scripts/test-json-mini.sh                  # default: --network local
#   NETWORK=ic ./scripts/test-json-mini.sh       # not recommended; admin-gated
#
# Tests are grouped:
#   POSITIVE — happy-path fixtures covering each supported feature
#   NEGATIVE — out-of-subset inputs that must produce #err with descriptive msg
#
# Expected outcome: every test prints PASS; final line "X passed, 0 failed".
# Exit code 0 = all green; non-zero = at least one fixture failed.

set -uo pipefail
NETWORK="${NETWORK:-local}"
PASS=0
FAIL=0
FAILED_NAMES=()

# Convert raw stdin bytes → Candid blob literal (hex-escaped form).
to_blob() {
  python3 -c '
import sys
data = sys.stdin.buffer.read()
print("(blob \"" + "".join(f"\\{b:02x}" for b in data) + "\")")
'
}

# run_test NAME EXPECT PATTERN  (input on stdin)
#   EXPECT  = "ok" | "err"
#   PATTERN = grep-substring expected somewhere in the result
run_test() {
  local name="$1"
  local expect="$2"
  local pattern="$3"
  local arg result got_kind
  arg=$(to_blob)
  result=$(dfx canister --network "$NETWORK" call backend _debugParseMetadata "$arg" 2>&1)
  # dfx pretty-prints variant results across multiple lines; flatten so grep
  # patterns matching e.g. "variant { err" don't have to span newlines.
  flat=$(echo "$result" | tr '\n' ' ' | tr -s ' ')

  if   echo "$flat" | grep -q "variant { ok";  then got_kind="ok"
  elif echo "$flat" | grep -q "variant { err"; then got_kind="err"
  else
    echo "FAIL: $name (could not parse result)"
    echo "  raw: $result"
    FAIL=$((FAIL+1)); FAILED_NAMES+=("$name"); return
  fi

  if [[ "$got_kind" != "$expect" ]]; then
    echo "FAIL: $name (expected $expect, got $got_kind)"
    echo "  raw: $result"
    FAIL=$((FAIL+1)); FAILED_NAMES+=("$name"); return
  fi

  if ! echo "$flat" | grep -q -- "$pattern"; then
    echo "FAIL: $name (kind=$expect, pattern '$pattern' not in result)"
    echo "  raw: $result"
    FAIL=$((FAIL+1)); FAILED_NAMES+=("$name"); return
  fi

  echo "PASS: $name"
  PASS=$((PASS+1))
}

echo "── Positive tests (path coverage of supported subset) ──────────────────"

run_test "minimal valid: empty object"        ok "object: 0 keys"   <<< '{}'
run_test "minimal valid: empty array"         ok "array: 0 items"   <<< '[]'
run_test "single string field"                ok "object: 1 keys"   <<< '{"a":"b"}'
run_test "empty string value"                 ok "object: 1 keys"   <<< '{"k":""}'
run_test "zero number value"                  ok "nat: 0"           <<< '0'
run_test "whole-number integer"               ok "nat: 42"          <<< '42'
run_test "decimal preserved as #Text"         ok '5.0'              <<< '5.0'
run_test "all supported types in one object"  ok "object: 4 keys"   <<< '{"s":"t","n":42,"f":5.0,"a":[1,2,3]}'
run_test "nested arrays"                      ok "array: 2 items"   <<< '[[1,2],[3,4]]'
run_test "string with backslash escapes"      ok "object: 1 keys"   <<< '{"k":"a\nb\tc\"d"}'
run_test "realistic 10-attribute shape"       ok "object" <<< '{"name":"x","attributes":[{"trait_type":"1","value":"a"},{"trait_type":"2","value":"b"},{"trait_type":"3","value":"c"},{"trait_type":"4","value":"d"},{"trait_type":"5","value":"e"},{"trait_type":"6","value":"f"},{"trait_type":"7","value":"g"},{"trait_type":"8","value":"h"},{"trait_type":"9","value":"i"},{"trait_type":"10","value":"j"}]}'

echo ""
echo "── Negative tests (subset boundaries — must #err) ──────────────────────"

run_test "REJECT: negative number"            err "subset rejects"           <<< '{"x":-1}'
run_test "REJECT: scientific notation"        err "scientific notation"      <<< '{"x":1e10}'
run_test "REJECT: unicode escape \\uXXXX"     err "uXXXX"                    <<< '{"k":"\u0041"}'
run_test "REJECT: null value"                 err "subset rejects"           <<< '{"x":null}'
run_test "REJECT: true value"                 err "subset rejects"           <<< '{"x":true}'
run_test "REJECT: false value"                err "subset rejects"           <<< '{"x":false}'
run_test "REJECT: trailing comma in object"   err "trailing comma in object" <<< '{"x":1,}'
run_test "REJECT: trailing comma in array"    err "trailing comma in array"  <<< '[1,2,]'
run_test "REJECT: duplicate key"              err "duplicate key"            <<< '{"x":1,"x":2}'
run_test "REJECT: leading zero in number"     err "leading zero"             <<< '{"x":01}'
run_test "REJECT: trailing data"              err "trailing data"            <<< '{"x":1}garbage'
run_test "REJECT: unterminated string"        err "unterminated string"      <<< '{"x":"abc'
run_test "REJECT: unterminated object"        err "unterminated object"      <<< '{"x":1'
run_test "REJECT: empty input"                err "empty input"              < /dev/null
run_test "REJECT: whitespace-only input"      err "whitespace-only"          <<< '   '

echo ""
echo "──────────────────────────────────────────"
echo "Total: $PASS passed, $FAIL failed"
if [[ $FAIL -gt 0 ]]; then
  echo "Failed: ${FAILED_NAMES[*]}"
  exit 1
fi

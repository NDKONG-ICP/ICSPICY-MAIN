#!/usr/bin/env bash
# scripts/phase3-smoke.sh
#
# Phase 3.7 end-to-end smoke test for the IC SPICY backend.
#
# Exercises the full ICRC-7 / ICRC-37 pipeline against a local replica:
#   mint pool → load metadata → certified verify → admin distribution →
#   owner approval → spender pulls token back via transfer_from.
#
# Pipeline assertions only — does NOT verify BLS signatures or re-derive
# Merkle roots (that's testing DFINITY's ic-certification library, not
# our code). Goal: prove every link in the chain works on real state.
#
# Usage:
#   ./scripts/phase3-smoke.sh
#
# Requirements:
#   - dfx local replica running ('dfx start --background')
#   - Backend canister already exists (dfx deploy backend at least once)
#   - Current dfx identity is an admin of the backend
#
# Exit code: 0 if all assertions pass, 1 otherwise.

set -euo pipefail

# ── Output formatting ─────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'
  BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; NC=$'\033[0m'
else
  GREEN=''; RED=''; BLUE=''; BOLD=''; NC=''
fi

PASSED=0
FAILED=0
FAILURES=()

step() {
  echo ""
  echo "${BOLD}${BLUE}── Step $1: $2${NC}"
}

assert_eq() {
  local label="$1"; local expected="$2"; local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  ${GREEN}PASS${NC} $label"
    PASSED=$((PASSED+1))
  else
    echo "  ${RED}FAIL${NC} $label"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    FAILED=$((FAILED+1))
    FAILURES+=("$label")
  fi
}

assert_contains() {
  local label="$1"; local needle="$2"; local haystack="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    echo "  ${GREEN}PASS${NC} $label"
    PASSED=$((PASSED+1))
  else
    echo "  ${RED}FAIL${NC} $label"
    echo "    expected to contain: $needle"
    echo "    actual:              $haystack"
    FAILED=$((FAILED+1))
    FAILURES+=("$label")
  fi
}

assert_not_contains() {
  local label="$1"; local needle="$2"; local haystack="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "  ${GREEN}PASS${NC} $label"
    PASSED=$((PASSED+1))
  else
    echo "  ${RED}FAIL${NC} $label"
    echo "    expected NOT to contain: $needle"
    echo "    actual:                  $haystack"
    FAILED=$((FAILED+1))
    FAILURES+=("$label")
  fi
}

ensure_identity() {
  local name="$1"
  if ! dfx identity list 2>/dev/null | grep -qx "$name"; then
    echo "  Creating identity: $name"
    dfx identity new "$name" --storage-mode plaintext >/dev/null 2>&1
  fi
}

# ── Setup ─────────────────────────────────────────────────────────────────
echo "${BOLD}IC SPICY Phase 3.7 smoke test${NC}"
echo ""

if ! dfx ping local >/dev/null 2>&1; then
  echo "${RED}Local replica not running. Start it with 'dfx start --background'.${NC}"
  exit 1
fi

ADMIN_IDENTITY=$(dfx identity whoami)
ADMIN_PRINCIPAL=$(dfx identity get-principal)
echo "Admin identity:  $ADMIN_IDENTITY"
echo "Admin principal: $ADMIN_PRINCIPAL"

ensure_identity buyer
BUYER_PRINCIPAL=$(dfx identity get-principal --identity buyer)
echo "Buyer principal: $BUYER_PRINCIPAL"

# ── Step 1: Reinstall backend (clean state) ───────────────────────────────
step 1 "Reinstall backend (fresh state)"
DEPLOY_OUT=$(dfx deploy --network local --mode reinstall backend --yes 2>&1 | tail -5)
assert_contains "deploy succeeded" "Deployed canisters" "$DEPLOY_OUT"

BACKEND_ID=$(dfx canister --network local id backend)
echo "  Backend canister ID: $BACKEND_ID"

# ── Step 2: initializeNFTPool — mint 8888 tokens to Self ──────────────────
step 2 "initializeNFTPool — mint 8888 tokens to Self"
INIT_OUT=$(dfx canister --network local call backend initializeNFTPool '()')
assert_contains "initialized = 8_888" "initialized = 8_888 : nat" "$INIT_OUT"
assert_contains "skipped = 0"         "skipped = 0 : nat"         "$INIT_OUT"

# ── Step 3: total_supply = 8888, supply_cap = opt 8888 ────────────────────
step 3 "icrc7_total_supply / icrc7_supply_cap"
TOTAL=$(dfx canister --network local call backend icrc7_total_supply '()')
assert_eq "total_supply = 8888" "(8_888 : nat)" "$TOTAL"

CAP=$(dfx canister --network local call backend icrc7_supply_cap '()')
assert_eq "supply_cap = opt 8888" "(opt (8_888 : nat))" "$CAP"

# ── Step 4: owner_of [1, 7888, 8888] → all Self ───────────────────────────
step 4 "icrc7_owner_of [1, 7888, 8888] all owned by Self ($BACKEND_ID)"
OWNERS=$(dfx canister --network local call backend icrc7_owner_of '(vec { 1 : nat; 7_888 : nat; 8_888 : nat })')
SELF_COUNT=$(echo "$OWNERS" | grep -c "principal \"$BACKEND_ID\"" || true)
assert_eq "all 3 entries owned by Self" "3" "$SELF_COUNT"

# ── Step 5: isPepperHead boundary checks ──────────────────────────────────
step 5 "isPepperHead — boundary tokens 7839 / 8726 / 8727"
PH_7839=$(dfx canister --network local call backend isPepperHead '(7839 : nat)')
assert_eq "token 7839 IS PepperHead"     "(true)"  "$PH_7839"

PH_8726=$(dfx canister --network local call backend isPepperHead '(8726 : nat)')
assert_eq "token 8726 IS PepperHead"     "(true)"  "$PH_8726"

PH_8727=$(dfx canister --network local call backend isPepperHead '(8727 : nat)')
assert_eq "token 8727 NOT PepperHead"    "(false)" "$PH_8727"

# ── Step 6: isPepperHeadAvailable = 888 ───────────────────────────────────
step 6 "isPepperHeadAvailable — 888 PepperHeads in pool"
AVAIL=$(dfx canister --network local call backend isPepperHeadAvailable '()')
assert_eq "888 PepperHeads available" "(888 : nat)" "$AVAIL"

# ── Step 7: loadStaticMetadata for tokens 1 and 8888 ──────────────────────
step 7 "loadStaticMetadata for tokens 1 and 8888"
LOAD_OUT=$(dfx canister --network local call backend loadStaticMetadata \
  '(vec {
      record { 1 : nat;    blob "{\"name\":\"IC SPICY #1\",\"rarity\":\"Common\"}" };
      record { 8888 : nat; blob "{\"name\":\"IC SPICY #8888\",\"rarity\":\"Self-Captain\"}" };
   })')
assert_contains "loaded = 2"   "loaded = 2 : nat"  "$LOAD_OUT"
assert_contains "skipped = 0"  "skipped = 0 : nat" "$LOAD_OUT"
assert_contains "errors empty" "errors = vec {}"   "$LOAD_OUT"

# ── Step 8: icrc7_token_metadata [1] → parsed structure ──────────────────
step 8 "icrc7_token_metadata [1] returns parsed fields"
META=$(dfx canister --network local call backend icrc7_token_metadata '(vec { 1 : nat })')
assert_contains "name field present"   '"name"'      "$META"
assert_contains "name value present"   "IC SPICY #1" "$META"
assert_contains "rarity field present" '"rarity"'    "$META"
assert_contains "rarity value present" "Common"      "$META"

# ── Step 9: icrc7_token_metadata_certified(1) ─────────────────────────────
step 9 "icrc7_token_metadata_certified(1) — value, certificate, witness"
CERT=$(dfx canister --network local call backend icrc7_token_metadata_certified '(1 : nat)')
assert_contains     "value non-null"               "value = opt blob"       "$CERT"
assert_contains     "certificate non-null"         "certificate = opt blob" "$CERT"
assert_contains     "witness present"              "witness = blob"         "$CERT"
assert_not_contains "value not null"               "value = null"           "$CERT"
assert_not_contains "certificate not null"         "certificate = null"     "$CERT"
# Witness must NOT be the canonical empty-tree witness — confirms
# loadStaticMetadata wrote the leaf into the cert tree.
assert_not_contains "witness != empty-tree witness" 'witness = blob "\d9\d9\f7\81\00"' "$CERT"
# Witness must contain the "icrc7" label bytes (UTF-8: 69 63 72 63 37)
# at the path root — confirms our path scheme is in effect.
assert_contains     "witness has 'icrc7' label"   '\69\63\72\63\37' "$CERT"

# ── Step 10: adminTransferFromPool — distribute token 1 to buyer ──────────
step 10 "adminTransferFromPool — distribute token 1 to buyer"
DIST_OUT=$(dfx canister --network local call backend adminTransferFromPool \
  "(1 : nat, record { owner = principal \"$BUYER_PRINCIPAL\"; subaccount = null })")
assert_contains "distribution Ok"           "Ok = "        "$DIST_OUT"
assert_not_contains "distribution not Err"  "Err"          "$DIST_OUT"

# ── Step 11: ownership changed, balance updated, supply unchanged ─────────
step 11 "Post-distribution state — owner / balance / supply"
NEW_OWNER=$(dfx canister --network local call backend icrc7_owner_of '(vec { 1 : nat })')
assert_contains     "owner is now buyer" "principal \"$BUYER_PRINCIPAL\"" "$NEW_OWNER"
assert_not_contains "owner is no longer Self" "principal \"$BACKEND_ID\"" "$NEW_OWNER"

BUYER_BAL=$(dfx canister --network local call backend icrc7_balance_of \
  "(vec { record { owner = principal \"$BUYER_PRINCIPAL\"; subaccount = null } })")
assert_eq "buyer balance = 1" "(vec { 1 : nat })" "$BUYER_BAL"

TOTAL_AFTER=$(dfx canister --network local call backend icrc7_total_supply '()')
assert_eq "total_supply unchanged at 8888" "(8_888 : nat)" "$TOTAL_AFTER"

# ── Step 12: buyer approves admin → admin transfer_from back to Self ──────
step 12 "Buyer approves admin as spender; admin transfer_from to Self"

# Buyer (current owner of token 1) approves admin as a spender.
APPROVE_OUT=$(dfx --identity buyer canister --network local call backend icrc37_approve_tokens \
  "(vec {
      record {
        token_id      = 1 : nat;
        approval_info = record {
          from_subaccount = null;
          spender         = record {
            owner      = principal \"$ADMIN_PRINCIPAL\";
            subaccount = null;
          };
          memo            = null;
          expires_at      = null;
          created_at_time = null;
        };
      }
   })")
assert_contains "approve Ok" "Ok = " "$APPROVE_OUT"

# Sanity: approval is now visible.
IS_APP_PRE=$(dfx canister --network local call backend icrc37_is_approved \
  "(vec {
      record {
        spender         = record {
          owner      = principal \"$ADMIN_PRINCIPAL\";
          subaccount = null;
        };
        from_subaccount = null;
        token_id        = 1 : nat;
      }
   })")
assert_eq "approval visible pre-transfer" "(vec { true })" "$IS_APP_PRE"

# Admin (current identity) calls transfer_from to pull the token back to Self.
TF_OUT=$(dfx canister --network local call backend icrc37_transfer_from \
  "(vec {
      record {
        spender_subaccount = null;
        from               = record {
          owner      = principal \"$BUYER_PRINCIPAL\";
          subaccount = null;
        };
        to                 = record {
          owner      = principal \"$BACKEND_ID\";
          subaccount = null;
        };
        token_id           = 1 : nat;
        memo               = null;
        created_at_time    = null;
      }
   })")
assert_contains "transfer_from Ok" "Ok = " "$TF_OUT"

# ── Step 13: ownership returned to Self, approval cleared ─────────────────
step 13 "Post-transfer_from — owner back at Self, approval cleared"
FINAL_OWNER=$(dfx canister --network local call backend icrc7_owner_of '(vec { 1 : nat })')
assert_contains     "owner restored to Self"     "principal \"$BACKEND_ID\""    "$FINAL_OWNER"
assert_not_contains "owner no longer buyer"      "principal \"$BUYER_PRINCIPAL\"" "$FINAL_OWNER"

# Approvals are cleared on every transfer (removeAllApprovals in
# processTransferFromOne) — so the prior buyer→admin approval must be gone.
IS_APP_POST=$(dfx canister --network local call backend icrc37_is_approved \
  "(vec {
      record {
        spender         = record {
          owner      = principal \"$ADMIN_PRINCIPAL\";
          subaccount = null;
        };
        from_subaccount = null;
        token_id        = 1 : nat;
      }
   })")
assert_eq "approval cleared on transfer" "(vec { false })" "$IS_APP_POST"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "${BOLD}── Summary ─────────────────────────────────────────${NC}"
TOTAL_ASSERT=$((PASSED + FAILED))
echo "  Passed: ${GREEN}$PASSED${NC} / $TOTAL_ASSERT"
echo "  Failed: ${RED}$FAILED${NC} / $TOTAL_ASSERT"
if [[ $FAILED -gt 0 ]]; then
  echo ""
  echo "${RED}Failed assertions:${NC}"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
echo "${GREEN}All assertions passed.${NC}"
exit 0

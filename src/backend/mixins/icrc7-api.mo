// mixins/icrc7-api.mo
//
// ICRC-7 + ICRC-37 API surface for the IC SPICY 8888-token NFT collection.
//
// Phase 3.1 — empty scaffold. Methods land in subsequent sub-phases:
//
//   3.2  Standard ICRC-7 query methods:
//        icrc7_collection_metadata, icrc7_total_supply, icrc7_supply_cap,
//        icrc7_token_metadata, icrc7_owner_of, icrc7_balance_of,
//        icrc7_tokens, icrc7_tokens_of, plus the per-tier helpers
//        isPepperHead and isPepperHeadAvailable.
//
//   3.3  icrc7_transfer (batch update method) with reentrancy wiring via
//        callerGuards per AGENTS.md "Phase 4 wiring requirements".
//
//   3.4  ICRC-37 approval extension:
//        icrc37_approve_tokens, icrc37_transfer_from, icrc37_is_approved,
//        icrc37_get_token_approvals, optionally icrc37_revoke_token_approvals.
//
//   3.5  initializeNFTPool admin method that mints all 8888 tokens to
//        Account { owner = Principal.fromActor(Self); subaccount = null }.
//        Idempotent skip on re-run.
//
//   3.6  icrc7_token_metadata_certified — separate two-method shape per the
//        locked Phase 3 decision (Q3): the standard icrc7_token_metadata
//        stays spec-pure; verifier clients call the _certified variant for
//        the {value, certificate, witness} envelope.
//
// Atomic ownership invariant (LOCKED IN per PROJECT_CONTEXT.md "ICRC-7
// implementation rules"): lib/icrc7.mo (added in 3.2) exposes a single
// `assignOwnership(tokenId, fromAccount?, toAccount)` helper that is the
// SOLE entry point for icrc7Owners / icrc7Balances mutations. Every method
// in this mixin that moves ownership goes through that helper. Direct
// writes to either map are forbidden — a code-review hard rule.

import Map "mo:core/Map";
import Set "mo:core/Set";
import ICRC7 "../types/icrc7";
import AccessControl "../lib/access-control";
import CallerGuard "../lib/caller-guard";

mixin (
  _accessControlState : AccessControl.AccessControlState,
  _callerGuards       : CallerGuard.GuardMap,
  _icrc7Owners        : Map.Map<Nat, ICRC7.Account>,
  _icrc7Balances      : Map.Map<Principal, Set.Set<Nat>>,
) {
  // No public methods yet. Phase 3.2 starts adding them here.
};

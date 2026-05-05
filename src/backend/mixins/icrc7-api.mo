// mixins/icrc7-api.mo
//
// ICRC-7 + ICRC-37 API surface for the IC SPICY 8888-token NFT collection.
//
// Phase 3.2 status — first method landed: a TEMPORARY admin-only debug
// method (_debugParseMetadata) for fixture validation of lib/json-mini.mo.
// The debug method is REMOVED in the follow-up Phase 3.2 commit; only the
// parser, fixtures, and test scripts persist past the cleanup commit.
//
// Future sub-phases per the Phase 3 sub-plan:
//
//   3.2 (rest) Standard ICRC-7 query methods, loadStaticMetadata admin,
//              isPepperHead / isPepperHeadAvailable helpers.
//   3.3        icrc7_transfer (batch update method) with reentrancy wiring
//              via callerGuards per AGENTS.md "Phase 4 wiring requirements".
//   3.4        ICRC-37 approval extension.
//   3.5        initializeNFTPool admin method that mints 8888 tokens to
//              Account { owner = Principal.fromActor(Self); subaccount = null }.
//   3.6        icrc7_token_metadata_certified envelope query (two-method
//              shape per the locked Phase 3 decision Q3).
//
// Atomic ownership invariant (LOCKED IN per PROJECT_CONTEXT.md "ICRC-7
// implementation rules"): lib/icrc7.mo (added in 3.2 production commit)
// exposes a single `assignOwnership(tokenId, fromAccount?, toAccount)`
// helper that is the SOLE entry point for icrc7Owners / icrc7Balances
// mutations. Direct writes to either map are forbidden — code-review rule.

import Map "mo:core/Map";
import Set "mo:core/Set";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import ICRC7 "../types/icrc7";
import AccessControl "../lib/access-control";
import CallerGuard "../lib/caller-guard";
import JsonMini "../lib/json-mini";

mixin (
  accessControlState     : AccessControl.AccessControlState,
  _callerGuards          : CallerGuard.GuardMap,
  _icrc7Owners           : Map.Map<Nat, ICRC7.Account>,
  _icrc7Balances         : Map.Map<Principal, Set.Set<Nat>>,
  _icrc7TokenMetadataRaw : Map.Map<Nat, Blob>,
  _selfPrincipal         : () -> Principal,
  _collectionName        : Text,
  _totalSupplyCap        : Nat,
) {

  // ── TEMPORARY: parser fixture-validation harness ──────────────────────────
  //
  // _debugParseMetadata exists ONLY for the duration of the parser-validation
  // commit. The follow-up Phase 3.2 commit removes both this method and the
  // imports it requires (Result, Runtime, JsonMini stay — they get used by
  // the production loadStaticMetadata method).
  //
  // The leading underscore signals "not part of the production surface" — the
  // method is Candid-exposed but admin-gated and traps for non-admins. The
  // method exists in commit history briefly, removed in the next commit
  // before any production traffic could ever reach it.

  public shared({caller}) func _debugParseMetadata(blob : Blob) : async Result.Result<Text, Text> {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("_debugParseMetadata is admin-only");
    };
    switch (JsonMini.parse(blob)) {
      case (#ok value) #ok(JsonMini.summarize(value));
      case (#err msg)  #err msg;
    };
  };
};

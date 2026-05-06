// mixins/icrc7-api.mo
//
// ICRC-7 API surface for the IC SPICY 8888-token NFT collection.
//
// Phase 3.2 — production state. Methods land here:
//   - loadStaticMetadata          admin bulk-load of templated JSON, parse-on-load
//   - getLoadedMetadataCount      ops query for the deploy script
//   - 8 standard ICRC-7 data queries:
//       icrc7_collection_metadata, icrc7_total_supply, icrc7_supply_cap,
//       icrc7_token_metadata, icrc7_owner_of, icrc7_balance_of,
//       icrc7_tokens, icrc7_tokens_of
//   - 12 standard ICRC-7 config queries (icrc7_name, icrc7_symbol,
//       icrc7_description, icrc7_logo, icrc7_max_query_batch_size,
//       icrc7_max_update_batch_size, icrc7_default_take_value,
//       icrc7_max_take_value, icrc7_max_memo_size, icrc7_atomic_batch_transfers,
//       icrc7_tx_window, icrc7_permitted_drift). Trivial one-liners; included
//       for spec compliance even though the user's plan listed only the 8
//       data queries.
//   - 2 IC SPICY custom helpers (isPepperHead, isPepperHeadAvailable)
//
// Future sub-phases per the Phase 3 sub-plan:
//   3.3   icrc7_transfer (batch update method) with reentrancy wiring via
//         callerGuards per AGENTS.md "Phase 4 wiring requirements".
//   3.4   ICRC-37 approval extension.
//   3.5   initializeNFTPool admin method that mints 8888 tokens to
//         Account { owner = Principal.fromActor(Self); subaccount = null }.
//   3.6   icrc7_token_metadata_certified envelope query (two-method shape
//         per the locked Phase 3 decision Q3).
//
// Atomic ownership invariant (LOCKED IN per PROJECT_CONTEXT.md "ICRC-7
// implementation rules"): lib/icrc7.mo's `assignOwnership` is the SOLE
// entry point for icrc7Owners / icrc7Balances mutations. Every method in
// this mixin that moves ownership goes through that helper. Direct writes
// to either map are forbidden — code-review hard rule. Phase 3.2 has no
// transfer/mint methods yet (those land in 3.3 and 3.5); the rule is in
// effect as of this commit.

import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

import ICRC7 "../types/icrc7";
import AccessControl "../lib/access-control";
import CallerGuard "../lib/caller-guard";
import IcrcLib "../lib/icrc7";
import JsonMini "../lib/json-mini";

mixin (
  accessControlState     : AccessControl.AccessControlState,
  _callerGuards          : CallerGuard.GuardMap,
  icrc7Owners            : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances          : Map.Map<Principal, Set.Set<Nat>>,
  icrc7TokenMetadataRaw  : Map.Map<Nat, Blob>,
  selfPrincipal          : () -> Principal,
  collectionName         : Text,
  totalSupplyCap         : Nat,
) {

  // ── Admin: bulk-load static metadata ──────────────────────────────────────

  public type LoadStaticMetadataResult = {
    loaded  : Nat;
    skipped : Nat;
    errors  : [(Nat, Text)];
  };

  // Parses each blob via JsonMini at load time so malformed JSON surfaces
  // here, not at first icrc7_token_metadata query. Per locked Phase 3.2
  // design Q2. Idempotent: token_ids already present in the map are skipped
  // (re-running the deploy script after a partial success is safe).
  public shared({caller}) func loadStaticMetadata(
    entries : [(Nat, Blob)],
  ) : async LoadStaticMetadataResult {
    AccessControl.requireAdmin(accessControlState, caller);
    var loaded  : Nat = 0;
    var skipped : Nat = 0;
    let errors  = List.empty<(Nat, Text)>();
    for ((tokenId, blob) in entries.vals()) {
      switch (icrc7TokenMetadataRaw.get(tokenId)) {
        case (?_) { skipped += 1 };
        case null {
          switch (JsonMini.parse(blob)) {
            case (#err msg) {
              List.add<(Nat, Text)>(errors, (tokenId, msg));
            };
            case (#ok _) {
              icrc7TokenMetadataRaw.add(tokenId, blob);
              loaded += 1;
            };
          };
        };
      };
    };
    { loaded; skipped; errors = List.toArray(errors) };
  };

  public query func getLoadedMetadataCount() : async Nat {
    icrc7TokenMetadataRaw.size();
  };

  // ── Standard ICRC-7 config getters ────────────────────────────────────────

  public query func icrc7_name() : async Text { collectionName };
  public query func icrc7_symbol() : async Text { "ICSPICY" };
  public query func icrc7_description() : async ?Text {
    ?"IC SPICY: 8888 RWA NFTs for the IC SPICY pepper nursery in Port Charlotte, FL."
  };
  public query func icrc7_logo() : async ?Text { null };

  public query func icrc7_total_supply() : async Nat { icrc7Owners.size() };
  public query func icrc7_supply_cap()   : async ?Nat { ?totalSupplyCap };

  public query func icrc7_max_query_batch_size()   : async ?Nat { ?(IcrcLib.MAX_TAKE) };
  public query func icrc7_max_update_batch_size()  : async ?Nat { ?(IcrcLib.MAX_TAKE) };
  public query func icrc7_default_take_value()     : async ?Nat { ?(IcrcLib.DEFAULT_TAKE) };
  public query func icrc7_max_take_value()         : async ?Nat { ?(IcrcLib.MAX_TAKE) };
  public query func icrc7_max_memo_size()          : async ?Nat { ?32 };
  public query func icrc7_atomic_batch_transfers() : async ?Bool { ?false };
  // tx_window and permitted_drift are in nanoseconds; values consumed by
  // Phase 3.3's icrc7_transfer dedup logic.
  public query func icrc7_tx_window()       : async ?Nat { ?(24 * 60 * 60 * 1_000_000_000) }; // 24h
  public query func icrc7_permitted_drift() : async ?Nat { ?(2 * 60 * 1_000_000_000) };       // 2min

  // ── Standard ICRC-7 data queries ──────────────────────────────────────────

  public query func icrc7_collection_metadata() : async [(Text, ICRC7.Value)] {
    [
      ("icrc7:name",                  #Text(collectionName)),
      ("icrc7:symbol",                #Text("ICSPICY")),
      ("icrc7:total_supply_cap",      #Nat(totalSupplyCap)),
      ("icrc7:max_query_batch_size",  #Nat(IcrcLib.MAX_TAKE)),
      ("icrc7:max_update_batch_size", #Nat(IcrcLib.MAX_TAKE)),
      ("icrc7:default_take_value",    #Nat(IcrcLib.DEFAULT_TAKE)),
      ("icrc7:max_take_value",        #Nat(IcrcLib.MAX_TAKE)),
      ("icrc7:max_memo_size",         #Nat(32)),
      // Project-namespaced custom keys per ICRC-7 conventions:
      ("icspicy:pepperhead_total",    #Nat(888)),
    ];
  };

  public query func icrc7_token_metadata(token_ids : [Nat]) : async [?[(Text, ICRC7.Value)]] {
    Array.map<Nat, ?[(Text, ICRC7.Value)]>(
      token_ids,
      func(id : Nat) : ?[(Text, ICRC7.Value)] {
        switch (icrc7TokenMetadataRaw.get(id)) {
          case null null;
          case (?blob) {
            // Parse-on-load means this should never #err in practice; safety
            // net only.
            switch (JsonMini.parse(blob)) {
              case (#err _) null;
              case (#ok value) {
                switch value {
                  case (#Map entries) ?entries;
                  case _              null; // top-level must be object
                };
              };
            };
          };
        };
      },
    );
  };

  public query func icrc7_owner_of(token_ids : [Nat]) : async [?ICRC7.Account] {
    Array.map<Nat, ?ICRC7.Account>(
      token_ids,
      func(id : Nat) : ?ICRC7.Account { icrc7Owners.get(id) },
    );
  };

  public query func icrc7_balance_of(accounts : [ICRC7.Account]) : async [Nat] {
    Array.map<ICRC7.Account, Nat>(
      accounts,
      func(a : ICRC7.Account) : Nat { IcrcLib.balanceOf(icrc7Balances, a) },
    );
  };

  public query func icrc7_tokens(prev : ?Nat, take : ?Nat) : async [Nat] {
    IcrcLib.paginateAllTokens(icrc7Owners, prev, take);
  };

  public query func icrc7_tokens_of(
    account : ICRC7.Account,
    prev    : ?Nat,
    take    : ?Nat,
  ) : async [Nat] {
    IcrcLib.tokensOf(icrc7Balances, account, prev, take);
  };

  // ── IC SPICY custom helpers ───────────────────────────────────────────────

  public query func isPepperHead(tokenId : Nat) : async Bool {
    IcrcLib.isPepperHead(tokenId);
  };

  // Returns count of PepperHead tokens still owned by the canister itself.
  // Used by the Phase 4 frontend "X of 888 remaining" indicator.
  public query func isPepperHeadAvailable() : async Nat {
    let self = selfPrincipal();
    switch (icrc7Balances.get(self)) {
      case null 0;
      case (?set) {
        var count : Nat = 0;
        for (id in set.values()) {
          if (IcrcLib.isPepperHead(id)) count += 1;
        };
        count;
      };
    };
  };
};

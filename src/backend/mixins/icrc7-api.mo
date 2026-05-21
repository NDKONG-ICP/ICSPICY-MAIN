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
import CertifiedData "mo:core/CertifiedData";
import Int "mo:core/Int";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import Time "mo:core/Time";

import ICRC7 "../types/icrc7";
import ICRC37 "../types/icrc37";
import AccessControl "../lib/access-control";
import CallerGuard "../lib/caller-guard";
import Cert "../lib/cert";
import IcrcLib "../lib/icrc7";
import NftDiscount "../lib/nft-discount";
import AdminIcrc7Lib "../lib/admin-icrc7";
import Icrc37Lib "../lib/icrc37";
import JsonMini "../lib/json-mini";

mixin (
  accessControlState     : AccessControl.AccessControlState,
  callerGuards           : CallerGuard.GuardMap,
  icrc7Owners            : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances          : Map.Map<Principal, Set.Set<Nat>>,
  icrc7TokenMetadataRaw  : Map.Map<Nat, Blob>,
  selfPrincipal          : () -> Principal,
  collectionName         : Text,
  totalSupplyCap         : Nat,
  nextBlockIndex         : { var value : Nat },
  recentTxLookup         : Map.Map<Blob, Nat>,
  recentTxByOrder        : Map.Map<Nat, Blob>,
  recentTxCursor         : { var oldest : Nat; var next : Nat },
  icrc37Approvals        : Map.Map<Nat, Map.Map<Principal, ICRC37.ApprovalInfo>>,
  certStore              : Cert.Store,
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
              // Phase 3.6: insert into the certified-data Merkle tree at
              // the canonical token path. Re-certification of the IC slot
              // happens ONCE at end-of-batch (Q2) — intermediate states
              // within a single message aren't observable.
              Cert.putTokenMetadata(certStore, tokenId, blob);
              loaded += 1;
            };
          };
        };
      };
    };
    // Re-certify only when the tree actually changed. Cheap to call
    // unconditionally, but skipping no-op batches keeps the certified
    // history monotonically meaningful.
    if (loaded > 0) {
      Cert.setCertifiedData(certStore);
    };
    { loaded; skipped; errors = List.toArray(errors) };
  };

  public query func getLoadedMetadataCount() : async Nat {
    icrc7TokenMetadataRaw.size();
  };

  // ── Admin: initialize the 8888-token pool (Phase 3.5) ─────────────────────
  //
  // Mints all `totalSupplyCap` tokens to Self in a single canister message.
  // Per-token idempotent: re-running after a partial trap or full success
  // skips already-minted tokens. Safe to invoke as the recovery primitive
  // if the loop ever hits the per-message instruction limit (current
  // estimate: ~575M instructions for 8888 BTree inserts, well under the
  // 5B limit; if a future code change pushes us over, the recovery path
  // is just to call again — no batching needed for the happy path).
  //
  // SOLE-entry-point invariant: assignOwnership is the only mutator. The
  // pre-existence check (`icrc7Owners.get(tokenId)`) filters the expected
  // #err case (already-minted), so `assignOwnership` should always succeed
  // here. An unexpected #err means an invariant violation upstream — trap
  // loudly so the bug surfaces, matching the trap-on-invariant-violation
  // pattern in lib/icrc7.mo.
  //
  // No approval invalidation: these are fresh mints (fromAccount = null),
  // so the prior-owner cleanup that icrc7_transfer / transfer_from do is
  // not needed.
  public shared({caller}) func initializeNFTPool() : async {
    initialized : Nat;
    skipped     : Nat;
  } {
    AccessControl.requireAdmin(accessControlState, caller);
    let self : ICRC7.Account = {
      owner      = selfPrincipal();
      subaccount = null;
    };
    var initialized : Nat = 0;
    var skipped     : Nat = 0;
    var tokenId     : Nat = 1;
    while (tokenId <= totalSupplyCap) {
      switch (icrc7Owners.get(tokenId)) {
        case (?_) { skipped += 1 };
        case null {
          switch (IcrcLib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, null, self)) {
            case (#ok) { initialized += 1 };
            case (#err msg) {
              Runtime.trap(
                "initializeNFTPool: assignOwnership failed for token " #
                Nat.toText(tokenId) # ": " # msg
              );
            };
          };
        };
      };
      tokenId += 1;
    };
    { initialized; skipped };
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
  public query func icrc7_max_memo_size()          : async ?Nat { ?(IcrcLib.MAX_MEMO_BYTES) };
  public query func icrc7_atomic_batch_transfers() : async ?Bool { ?false };
  // tx_window and permitted_drift are in nanoseconds; values consumed by
  // Phase 3.3's icrc7_transfer dedup logic. Single source of truth lives
  // in lib/icrc7.mo so the spec window and the validation can't drift.
  public query func icrc7_tx_window()       : async ?Nat { ?(IcrcLib.TX_WINDOW_NS) };
  public query func icrc7_permitted_drift() : async ?Nat { ?(IcrcLib.PERMITTED_DRIFT_NS) };

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
      ("icrc7:max_memo_size",         #Nat(IcrcLib.MAX_MEMO_BYTES)),
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

  // Phase 3.6: certified single-token metadata read.
  //
  // Returns the raw metadata blob, the IC subnet's certificate over the
  // canister's certified-data slot, and a Merkle witness from that
  // certified root down to the token's leaf at path
  //   ["icrc7", "<tokenId>"]   — see lib/cert.mo.
  //
  // Why single-token (not batched): batching forces the client to verify
  // a multi-leaf witness, which complicates off-chain verifiers and ties
  // the witness shape to a request-time selection. Per Phase 3.6 design,
  // batched callers can hit icrc7_token_metadata for the uncertified
  // fast path and only re-fetch via this method when a verified read is
  // needed.
  //
  // Field semantics:
  //   value       — ?Blob: null when token isn't loaded; the witness
  //                 still cryptographically proves that absence.
  //   certificate — ?Blob: null only inside update calls (CertifiedData
  //                 .getCertificate is query-only). Always present here.
  //   witness     — Blob: encoded Merkle path; valid for both presence
  //                 and absence cases.
  public query func icrc7_token_metadata_certified(tokenId : Nat) : async {
    value       : ?Blob;
    certificate : ?Blob;
    witness     : Blob;
  } {
    {
      value       = icrc7TokenMetadataRaw.get(tokenId);
      certificate = CertifiedData.getCertificate();
      witness     = Cert.tokenWitness(certStore, tokenId);
    };
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

  // ── ICRC-7 transfer (Phase 3.3) ───────────────────────────────────────────
  //
  // Batch transfer. Each element is processed independently — one element's
  // failure does NOT fail the batch. The returned vector has one slot per
  // input arg in the same order; each slot is `?#Ok(blockIndex)` or
  // `?#Err(TransferError)`.
  //
  // Reentrancy: callerGuards is the per-caller in-flight lock from
  // lib/caller-guard.mo. icrc7_transfer has no awaits today (single-message
  // synchronous mutation), so the guard is a no-op — but the try/finally
  // wrapping is structurally required from day one per AGENTS.md "Phase 4
  // wiring requirements". When Phase 4 settlement methods (placeOrder,
  // confirmICPayPayment) introduce real awaits, the lock prevents a
  // second in-flight call from the same caller from racing the first.
  //
  // Single-pass semantics: each element observes the state as modified by
  // earlier elements in this same batch. This is the spec-correct behavior
  // for the "transfer token A to Bob, then transfer token A to Carol in
  // one batch" case — first element succeeds, second fails Unauthorized
  // because Bob now owns the token, not the original caller.
  //
  // SOLE-entry-point invariant: ownership maps are mutated only via
  // IcrcLib.assignOwnership. validateTransferArg runs first (pure check);
  // assignOwnership runs second (atomic two-map mutation). No direct map
  // writes anywhere in this method.
  public shared({caller}) func icrc7_transfer(
    args : [ICRC7.TransferArgs],
  ) : async [?ICRC7.TransferResult] {
    AccessControl.requireAuthenticated(caller);

    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err msg) { Runtime.trap("Request already in flight: " # msg) };
      case (#ok) {};
    };

    try {
      let now : Nat = Int.abs(Time.now());
      let results = List.empty<?ICRC7.TransferResult>();
      for (arg in args.vals()) {
        List.add(results, ?processTransferOne(arg, caller, now));
      };
      List.toArray(results);
    } finally {
      CallerGuard.release(callerGuards, caller);
    };
  };

  func processTransferOne(
    arg    : ICRC7.TransferArgs,
    caller : Principal,
    now    : Nat,
  ) : ICRC7.TransferResult {
    let currentOwner = icrc7Owners.get(arg.token_id);

    // Phase 3.4: caller may be the direct owner OR an approved spender.
    // The lookup is skipped if currentOwner is null (validateTransferArg
    // will return NonExistingTokenId in that case).
    let isApprovedSpender = switch currentOwner {
      case null false;
      case (?_) Icrc37Lib.isApproved(icrc37Approvals, arg.token_id, caller, now);
    };

    let owner = switch (IcrcLib.validateTransferArg(arg, caller, isApprovedSpender, currentOwner, now)) {
      case (#err e) { return #Err(e) };
      case (#ok o) o;
    };

    // Dedup is opt-in via created_at_time per ICRC-7 spec. If null, the
    // caller is acknowledging they don't need replay protection — skip the
    // hash + lookup entirely. Also skips recording on success: an entry
    // with no created_at_time can't be hashed back to a duplicate anyway.
    let hash = IcrcLib.computeTxHash(caller, arg);
    switch (arg.created_at_time) {
      case null {};
      case (?_) {
        switch (IcrcLib.checkDedup(recentTxLookup, hash)) {
          case (?existing) { return #Err(#Duplicate { duplicate_of = existing }) };
          case null {};
        };
      };
    };

    switch (IcrcLib.assignOwnership(icrc7Owners, icrc7Balances, arg.token_id, ?owner, arg.to)) {
      case (#err msg) {
        // assignOwnership only returns #err for prior-state mismatch, which
        // validateTransferArg already covered. Reaching here means a state
        // race with another batch element that just moved the same token
        // — translate to a generic error so the rest of the batch survives.
        return #Err(#GenericError { error_code = 2; message = msg });
      };
      case (#ok) {};
    };

    // Phase 3.4: token changed owner — invalidate every approval the prior
    // owner granted on this token. Done HERE (in the transfer flow), not
    // inside assignOwnership, because assignOwnership is an ICRC-7 concept
    // that must not depend on ICRC-37.
    ignore Icrc37Lib.removeAllApprovals(icrc37Approvals, arg.token_id);

    let blockIndex = nextBlockIndex.value;
    nextBlockIndex.value += 1;
    if (arg.created_at_time != null) {
      IcrcLib.recordRecentTx(recentTxLookup, recentTxByOrder, recentTxCursor, hash, blockIndex);
    };

    #Ok(blockIndex);
  };

  // ── Admin pool distribution (Phase 3.7-prep) ──────────────────────────────
  //
  // adminTransferFromPool: moves tokens FROM the canister's own pool (Self) to
  // a recipient. Does NOT allow admin transfer of user-owned tokens — only
  // Self-owned tokens can be moved.
  // This is the standard distribution primitive for sales, airdrops, and
  // QR-claim fulfillment.
  //
  // Why this exists: initializeNFTPool mints all 8888 tokens to the canister
  // principal, and the canister cannot call its own update methods to set up
  // an approval for a distribution agent. icrc7_transfer is intentionally
  // NOT relaxed for admins — admins must not be able to confiscate
  // user-owned tokens. So pool distribution gets its own gated method with
  // a hard precondition: the token must currently belong to Self.
  //
  // Single-token by design: distribution events are individually auditable,
  // and CallerGuard already serializes per-caller.
  public shared({caller}) func adminTransferFromPool(
    tokenId : Nat,
    to      : ICRC7.Account,
  ) : async ICRC7.TransferResult {
    AccessControl.requireAdmin(accessControlState, caller);

    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err msg) { Runtime.trap("Request already in flight: " # msg) };
      case (#ok) {};
    };

    try {
      let currentOwner = switch (icrc7Owners.get(tokenId)) {
        case null { return #Err(#NonExistingTokenId) };
        case (?o) o;
      };

      // The pool account is exactly what initializeNFTPool wrote: the
      // canister principal with a null subaccount. accountsEqual normalizes
      // the subaccount comparison so a 32-zero-byte subaccount is treated
      // identically to null (matching IcrcLib's invariant).
      //
      // Spec requirement: "token is not in the pool — adminTransferFromPool
      // only moves Self-owned tokens". Maps to #Unauthorized per ICRC-7's
      // flag-variant convention; the human-readable rationale lives here in
      // the comment, not in the wire payload.
      let poolAccount : ICRC7.Account = {
        owner      = selfPrincipal();
        subaccount = null;
      };
      if (not IcrcLib.accountsEqual(currentOwner, poolAccount)) {
        return #Err(#Unauthorized);
      };

      switch (IcrcLib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?currentOwner, to)) {
        case (#err msg) {
          // assignOwnership only #errs on prior-state mismatch, which the
          // accountsEqual check above already covered. Reaching here means
          // a state race with another distribution call that just moved the
          // same token — translate to a generic error so a future batch
          // wrapper can survive (mirrors processTransferOne's pattern).
          return #Err(#GenericError { error_code = 2; message = msg });
        };
        case (#ok) {};
      };

      // Defensive: Self never grants approvals on its own pool tokens, so
      // this is effectively a no-op today. Kept for symmetry with
      // processTransferOne so every transfer path leaves identical
      // post-state — no path ever leaves stale approvals on a transferred
      // token.
      ignore Icrc37Lib.removeAllApprovals(icrc37Approvals, tokenId);

      let blockIndex = nextBlockIndex.value;
      nextBlockIndex.value += 1;
      // No created_at_time → no dedup record. Administrative action, not
      // user-facing replay-protected traffic.

      #Ok(blockIndex);
    } finally {
      CallerGuard.release(callerGuards, caller);
    };
  };

  // ── ICRC-37 approval surface (Phase 3.4) ──────────────────────────────────
  //
  // Approvals let an owner authorize a third-party "spender" to transfer
  // a specific token via icrc37_transfer_from. Approvals are cleared on
  // any ownership change (see removeAllApprovals call in processTransferOne
  // and processTransferFromOne) — the new owner did not grant them and
  // must not honor them.
  //
  // SOLE-entry-point invariant: approvals map is mutated only via
  // Icrc37Lib.{addApproval, removeApproval, removeAllApprovals}. No direct
  // map writes anywhere in this mixin.
  //
  // Reentrancy: all three update methods (approve / transfer_from / revoke)
  // share the icrc7_transfer CallerGuard so a single caller can have at
  // most one in-flight ICRC-7 / ICRC-37 mutation at a time.

  // Spec config getters — Phase 4 settlement methods may tighten these.
  public query func icrc37_max_approvals_per_token_or_collection() : async ?Nat {
    ?(IcrcLib.MAX_TAKE);
  };
  public query func icrc37_max_revoke_approvals() : async ?Nat {
    ?(IcrcLib.MAX_TAKE);
  };

  // ── icrc37_approve_tokens ────────────────────────────────────────────────
  public shared({caller}) func icrc37_approve_tokens(
    args : [ICRC37.ApproveTokenArg],
  ) : async [?ICRC37.ApproveTokenResult] {
    AccessControl.requireAuthenticated(caller);

    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err msg) { Runtime.trap("Request already in flight: " # msg) };
      case (#ok) {};
    };

    try {
      let now : Nat = Int.abs(Time.now());
      let results = List.empty<?ICRC37.ApproveTokenResult>();
      for (arg in args.vals()) {
        List.add(results, ?processApproveOne(arg, caller, now));
      };
      List.toArray(results);
    } finally {
      CallerGuard.release(callerGuards, caller);
    };
  };

  func processApproveOne(
    arg    : ICRC37.ApproveTokenArg,
    caller : Principal,
    now    : Nat,
  ) : ICRC37.ApproveTokenResult {
    let currentOwner = icrc7Owners.get(arg.token_id);

    switch (Icrc37Lib.validateApproveArg(arg, caller, currentOwner, now)) {
      case (#err e) { return #Err(e) };
      case (#ok _) {};
    };

    // Dedup uses the shared recent-tx buffer — approve and transfer hashes
    // are method-tagged so they cannot collide.
    let hash = Icrc37Lib.computeApproveHash(caller, arg);
    switch (arg.approval_info.created_at_time) {
      case null {};
      case (?_) {
        switch (IcrcLib.checkDedup(recentTxLookup, hash)) {
          case (?existing) { return #Err(#Duplicate { duplicate_of = existing }) };
          case null {};
        };
      };
    };

    // Mutation: replaces any prior approval for the same (token, spender
    // principal) pair. Prior approval expiry / memo / created_at_time is
    // overwritten — the new approval is authoritative.
    Icrc37Lib.addApproval(icrc37Approvals, arg.token_id, arg.approval_info);

    let blockIndex = nextBlockIndex.value;
    nextBlockIndex.value += 1;
    if (arg.approval_info.created_at_time != null) {
      IcrcLib.recordRecentTx(recentTxLookup, recentTxByOrder, recentTxCursor, hash, blockIndex);
    };

    #Ok(blockIndex);
  };

  // ── icrc37_transfer_from ─────────────────────────────────────────────────
  public shared({caller}) func icrc37_transfer_from(
    args : [ICRC37.TransferFromArg],
  ) : async [?ICRC37.TransferFromResult] {
    AccessControl.requireAuthenticated(caller);

    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err msg) { Runtime.trap("Request already in flight: " # msg) };
      case (#ok) {};
    };

    try {
      let now : Nat = Int.abs(Time.now());
      let results = List.empty<?ICRC37.TransferFromResult>();
      for (arg in args.vals()) {
        List.add(results, ?processTransferFromOne(arg, caller, now));
      };
      List.toArray(results);
    } finally {
      CallerGuard.release(callerGuards, caller);
    };
  };

  func processTransferFromOne(
    arg    : ICRC37.TransferFromArg,
    caller : Principal,
    now    : Nat,
  ) : ICRC37.TransferFromResult {
    let currentOwner = icrc7Owners.get(arg.token_id);
    let isApprovedSpender = Icrc37Lib.isApproved(icrc37Approvals, arg.token_id, caller, now);

    let owner = switch (Icrc37Lib.validateTransferFromArg(arg, isApprovedSpender, currentOwner, now)) {
      case (#err e) { return #Err(e) };
      case (#ok o) o;
    };

    let hash = Icrc37Lib.computeTransferFromHash(caller, arg);
    switch (arg.created_at_time) {
      case null {};
      case (?_) {
        switch (IcrcLib.checkDedup(recentTxLookup, hash)) {
          case (?existing) { return #Err(#Duplicate { duplicate_of = existing }) };
          case null {};
        };
      };
    };

    switch (IcrcLib.assignOwnership(icrc7Owners, icrc7Balances, arg.token_id, ?owner, arg.to)) {
      case (#err msg) {
        return #Err(#GenericError { error_code = 2; message = msg });
      };
      case (#ok) {};
    };

    // Same approval-invalidation rule as icrc7_transfer.
    ignore Icrc37Lib.removeAllApprovals(icrc37Approvals, arg.token_id);

    let blockIndex = nextBlockIndex.value;
    nextBlockIndex.value += 1;
    if (arg.created_at_time != null) {
      IcrcLib.recordRecentTx(recentTxLookup, recentTxByOrder, recentTxCursor, hash, blockIndex);
    };

    #Ok(blockIndex);
  };

  // ── icrc37_revoke_token_approvals ────────────────────────────────────────
  public shared({caller}) func icrc37_revoke_token_approvals(
    args : [ICRC37.RevokeTokenApprovalArg],
  ) : async [?ICRC37.RevokeTokenApprovalResult] {
    AccessControl.requireAuthenticated(caller);

    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err msg) { Runtime.trap("Request already in flight: " # msg) };
      case (#ok) {};
    };

    try {
      let now : Nat = Int.abs(Time.now());
      let results = List.empty<?ICRC37.RevokeTokenApprovalResult>();
      for (arg in args.vals()) {
        List.add(results, ?processRevokeOne(arg, caller, now));
      };
      List.toArray(results);
    } finally {
      CallerGuard.release(callerGuards, caller);
    };
  };

  func processRevokeOne(
    arg    : ICRC37.RevokeTokenApprovalArg,
    caller : Principal,
    now    : Nat,
  ) : ICRC37.RevokeTokenApprovalResult {
    let currentOwner = icrc7Owners.get(arg.token_id);

    switch (Icrc37Lib.validateRevokeArg(arg, caller, currentOwner, now)) {
      case (#err e) { return #Err(e) };
      case (#ok _) {};
    };

    let hash = Icrc37Lib.computeRevokeHash(caller, arg);
    switch (arg.created_at_time) {
      case null {};
      case (?_) {
        switch (IcrcLib.checkDedup(recentTxLookup, hash)) {
          case (?existing) { return #Err(#Duplicate { duplicate_of = existing }) };
          case null {};
        };
      };
    };

    // Spec semantics: spender = null revokes all; spender = ?account
    // revokes that specific (token, spender principal). If the targeted
    // approval doesn't exist, return ApprovalDoesNotExist per spec.
    let didRevoke = switch (arg.spender) {
      case null {
        let count = Icrc37Lib.removeAllApprovals(icrc37Approvals, arg.token_id);
        count > 0;
      };
      case (?spenderAcct) {
        Icrc37Lib.removeApproval(icrc37Approvals, arg.token_id, spenderAcct.owner);
      };
    };
    if (not didRevoke) {
      return #Err(#ApprovalDoesNotExist);
    };

    let blockIndex = nextBlockIndex.value;
    nextBlockIndex.value += 1;
    if (arg.created_at_time != null) {
      IcrcLib.recordRecentTx(recentTxLookup, recentTxByOrder, recentTxCursor, hash, blockIndex);
    };

    #Ok(blockIndex);
  };

  // ── icrc37_is_approved ───────────────────────────────────────────────────
  //
  // Batch query: per element returns true iff (spender principal, token_id)
  // has a non-expired approval. The from_subaccount field is currently
  // ignored — Phase 3 keys approvals by spender principal only (see
  // lib/icrc37.mo module comment).
  public query func icrc37_is_approved(
    args : [ICRC37.IsApprovedArg],
  ) : async [Bool] {
    let now : Nat = Int.abs(Time.now());
    Array.map<ICRC37.IsApprovedArg, Bool>(
      args,
      func(a : ICRC37.IsApprovedArg) : Bool {
        Icrc37Lib.isApproved(icrc37Approvals, a.token_id, a.spender.owner, now);
      },
    );
  };

  // ── icrc37_get_token_approvals ───────────────────────────────────────────
  public query func icrc37_get_token_approvals(
    token_id : Nat,
    prev     : ?ICRC37.TokenApproval,
    take     : ?Nat,
  ) : async [ICRC37.TokenApproval] {
    Icrc37Lib.getTokenApprovals(icrc37Approvals, token_id, prev, take);
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

  /// Storewide NFT holder discount for the calling principal (highest tier wins).
  public query ({ caller }) func getCallerDiscount() : async NftDiscount.CallerDiscount {
    NftDiscount.callerDiscountFromBalances(icrc7Balances, caller);
  };

  public shared({caller}) func adminReturnToPool(
    tokenId : Nat,
  ) : async ICRC7.TransferResult {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err msg) { Runtime.trap("Request already in flight: " # msg) };
      case (#ok) {};
    };
    try {
      let currentOwner = switch (icrc7Owners.get(tokenId)) {
        case null return #Err(#NonExistingTokenId);
        case (?o) o;
      };
      let poolAccount : ICRC7.Account = {
        owner = selfPrincipal();
        subaccount = null;
      };
      if (IcrcLib.accountsEqual(currentOwner, poolAccount)) {
        return #Err(#GenericError { error_code = 1; message = "Already in pool" });
      };
      switch (IcrcLib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?currentOwner, poolAccount)) {
        case (#err(msg)) return #Err(#GenericError { error_code = 2; message = msg });
        case (#ok) {};
      };
      ignore Icrc37Lib.removeAllApprovals(icrc37Approvals, tokenId);
      let blockIndex = nextBlockIndex.value;
      nextBlockIndex.value += 1;
      #Ok(blockIndex);
    } finally {
      CallerGuard.release(callerGuards, caller);
    };
  };

  public shared({caller}) func adminBatchAirdrop(
    recipients : [Principal],
    useRandom : Bool,
    startTokenId : ?Nat,
  ) : async [{
    recipient : Principal;
    token_id : Nat;
    success : Bool;
    message : Text;
  }] {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err msg) { Runtime.trap("Request already in flight: " # msg) };
      case (#ok) {};
    };
    try {
      var out : [{
        recipient : Principal;
        token_id : Nat;
        success : Bool;
        message : Text;
      }] = [];
      var cursor = switch (startTokenId) { case (?s) s; case null 1 };
      var i : Nat = 0;
      for (recipient in recipients.vals()) {
        let seed = if (useRandom) i * 997 + recipients.size() else 0;
        let picked = AdminIcrc7Lib.findNextPoolToken(
          icrc7Owners, selfPrincipal(), cursor, seed,
        );
        switch (picked) {
          case null {
            out := Array.concat(out, [{
              recipient;
              token_id = 0;
              success = false;
              message = "No pool token available";
            }]);
          };
          case (?tokenId) {
            let toAccount : ICRC7.Account = { owner = recipient; subaccount = null };
            let poolAccount : ICRC7.Account = {
              owner = selfPrincipal();
              subaccount = null;
            };
            let transferResult = switch (icrc7Owners.get(tokenId)) {
              case null #Err(#NonExistingTokenId);
              case (?currentOwner) {
                if (not IcrcLib.accountsEqual(currentOwner, poolAccount)) {
                  #Err(#Unauthorized)
                } else {
                  switch (
                    IcrcLib.assignOwnership(
                      icrc7Owners, icrc7Balances, tokenId, ?currentOwner, toAccount,
                    )
                  ) {
                    case (#err(msg)) {
                      #Err(#GenericError { error_code = 2; message = msg })
                    };
                    case (#ok) {
                      ignore Icrc37Lib.removeAllApprovals(icrc37Approvals, tokenId);
                      let blockIndex = nextBlockIndex.value;
                      nextBlockIndex.value += 1;
                      #Ok(blockIndex)
                    };
                  }
                }
              };
            };
            switch (transferResult) {
              case (#Ok(_)) {
                out := Array.concat(out, [{
                  recipient;
                  token_id = tokenId;
                  success = true;
                  message = "Transferred";
                }]);
                cursor := tokenId + 1;
              };
              case (#Err(_)) {
                out := Array.concat(out, [{
                  recipient;
                  token_id = tokenId;
                  success = false;
                  message = "Transfer failed";
                }]);
              };
            };
          };
        };
        i += 1;
      };
      out
    } finally {
      CallerGuard.release(callerGuards, caller);
    };
  };
};

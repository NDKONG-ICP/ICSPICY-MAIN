// lib/icrc7.mo
//
// Atomic ownership helper + per-tier predicates for the IC SPICY 8888-token
// ICRC-7 NFT collection. Phase 3.2 deliverable.
//
// LOCKED-IN INVARIANT (per PROJECT_CONTEXT.md "ICRC-7 implementation rules"):
// `assignOwnership` below is the SOLE entry point for mutating either of
// the two ownership maps. Direct writes from any other call site are
// forbidden and must be flagged in code review. The two-map invariant —
//
//   for all p, t:  t in icrc7Balances[p]  ⇔  icrc7Owners[t] = {owner=p, ...}
//
// — must hold across every observable state. Every state mutation runs
// synchronously within one Motoko message (no awaits inside the helper),
// so observers never see a half-applied transfer.

import Blob "mo:core/Blob";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import ICRC7 "../types/icrc7";

module {
  // ── Subaccount + Account normalization ────────────────────────────────────

  // Per ICRC-7: `null` and a 32-zero-byte blob denote the same logical
  // identity. Normalize on input so storage is unique.
  public func normalizeSubaccount(sub : ?Blob) : ?Blob {
    switch sub {
      case null null;
      case (?b) {
        let bytes = Blob.toArray(b);
        if (bytes.size() != 32) return ?b; // out-of-spec; pass through
        var allZero = true;
        var i = 0;
        while (i < 32 and allZero) {
          if (bytes[i] != (0 : Nat8)) allZero := false;
          i += 1;
        };
        if (allZero) null else ?b;
      };
    };
  };

  public func normalizeAccount(a : ICRC7.Account) : ICRC7.Account {
    { owner = a.owner; subaccount = normalizeSubaccount(a.subaccount) };
  };

  public func accountsEqual(a : ICRC7.Account, b : ICRC7.Account) : Bool {
    if (not Principal.equal(a.owner, b.owner)) return false;
    let na = normalizeSubaccount(a.subaccount);
    let nb = normalizeSubaccount(b.subaccount);
    switch (na, nb) {
      case (null, null) true;
      case (?x, ?y) Blob.equal(x, y);
      case _ false;
    };
  };

  // ── PepperHead predicate ──────────────────────────────────────────────────
  //
  // Token IDs are 1-indexed (matches `nft_<N>.png` artwork files). Pool
  // record IDs are 0-indexed (per lib/pool.mo). PROJECT_CONTEXT.md
  // "Membership NFTs (PepperHeads)" defines:
  //
  //   Founder         pool 7838-7887 → tokens 7839-7888  (50)
  //   Rare PepperHead pool 7888-8725 → tokens 7889-8726  (838)
  //
  // Together they form a single contiguous block in pool-ID space, so the
  // predicate is one range check.

  public func isPepperHead(tokenId : Nat) : Bool {
    if (tokenId == 0 or tokenId > 8888) return false;
    let poolId : Nat = tokenId - 1;
    poolId >= 7838 and poolId < 8726;
  };

  // ── Atomic ownership helper ───────────────────────────────────────────────
  //
  // SOLE entry point for icrc7Owners / icrc7Balances mutations.
  //
  //   fromAccount = null      → mint    (no prior owner; current must be unset)
  //   fromAccount = ?account  → transfer or burn (current owner must match `from`)
  //   toAccount               → new owner (Self for canister inventory; buyer
  //                             principal for transfers; burn principal for
  //                             redemption flows)
  //
  // Caller is responsible for caller-authorization (requireAuthenticated,
  // owner-or-approved checks, etc.). This helper enforces only the two-map
  // invariant + the prior-state claim.
  //
  // Returns:
  //   #ok         on success
  //   #err msg    if the prior-state claim doesn't match observed state.
  //
  // The helper traps only on internal invariant violations (e.g., owner map
  // says token is owned by P, but balances map has no entry for P) — those
  // indicate prior code violated the SOLE-entry-point rule.

  public func assignOwnership(
    owners      : Map.Map<Nat, ICRC7.Account>,
    balances    : Map.Map<Principal, Set.Set<Nat>>,
    tokenId     : Nat,
    fromAccount : ?ICRC7.Account,
    toAccount   : ICRC7.Account,
  ) : Result.Result<(), Text> {
    let normalizedTo = normalizeAccount(toAccount);

    // Validate the prior-state claim.
    let currentOwner = owners.get(tokenId);
    switch (fromAccount, currentOwner) {
      case (null, ?_) {
        return #err(
          "token " # Nat.toText(tokenId) #
          " is already minted; mint requires fromAccount=null and no current owner"
        );
      };
      case (null, null) {
        // Mint path: OK.
      };
      case (?from, null) {
        return #err(
          "token " # Nat.toText(tokenId) #
          " has no current owner; cannot transfer/burn from " #
          Principal.toText(from.owner)
        );
      };
      case (?from, ?current) {
        if (not accountsEqual(from, current)) {
          return #err(
            "token " # Nat.toText(tokenId) #
            " ownership mismatch: claimed " # Principal.toText(from.owner) #
            " but current owner is " # Principal.toText(current.owner)
          );
        };
      };
    };

    // Mutation block — synchronous, no awaits. Both maps update atomically
    // from the standpoint of any observer.
    owners.add(tokenId, normalizedTo);

    // Remove from previous owner's balance set
    switch (fromAccount) {
      case (?from) {
        switch (balances.get(from.owner)) {
          case (?set) {
            ignore set.delete(tokenId);
            if (set.size() == 0) {
              ignore balances.delete(from.owner);
            };
          };
          case null {
            // Should be unreachable given the validation above + the
            // SOLE-entry-point rule. If we hit it, the invariant has been
            // violated by a prior write — trap loudly so the bug surfaces.
            Runtime.trap(
              "assignOwnership invariant violation: token " # Nat.toText(tokenId) #
              " owned by " # Principal.toText(from.owner) #
              " but balances map has no entry — direct write to icrc7Owners?"
            );
          };
        };
      };
      case null {};
    };

    // Add to new owner's balance set (creating a new set if first holding).
    switch (balances.get(normalizedTo.owner)) {
      case (?set) {
        set.add(tokenId);
      };
      case null {
        let newSet = Set.empty<Nat>();
        newSet.add(tokenId);
        balances.add(normalizedTo.owner, newSet);
      };
    };

    #ok;
  };

  // ── Read helpers used by the public ICRC-7 query methods ──────────────────

  public func balanceOf(
    balances : Map.Map<Principal, Set.Set<Nat>>,
    account  : ICRC7.Account,
  ) : Nat {
    let normalized = normalizeAccount(account);
    // This canister mints / transfers only to subaccount=null. Any balance
    // query for a non-null subaccount is by construction zero — never
    // populated.
    switch (normalized.subaccount) {
      case (?_) 0;
      case null {
        switch (balances.get(normalized.owner)) {
          case (?set) set.size();
          case null  0;
        };
      };
    };
  };

  // ── Pagination helpers ────────────────────────────────────────────────────
  //
  // ICRC-7 pagination: results in ascending token-id order, starting AFTER
  // `prev` (if set), capped at `take` (with a hard ceiling for query safety).

  public let DEFAULT_TAKE : Nat = 1000;
  public let MAX_TAKE     : Nat = 1000;

  public func paginateSet(set : Set.Set<Nat>, prev : ?Nat, take : ?Nat) : [Nat] {
    let limit = effectiveLimit(take);
    let result = List.empty<Nat>();
    var collected : Nat = 0;
    label scan for (id in set.values()) {
      switch (prev) {
        case (?p) if (id <= p) { continue scan };
        case null {};
      };
      if (collected >= limit) break scan;
      List.add<Nat>(result, id);
      collected += 1;
    };
    List.toArray(result);
  };

  public func paginateAllTokens(
    owners : Map.Map<Nat, ICRC7.Account>,
    prev   : ?Nat,
    take   : ?Nat,
  ) : [Nat] {
    let limit = effectiveLimit(take);
    let result = List.empty<Nat>();
    var collected : Nat = 0;
    label scan for ((id, _) in owners.entries()) {
      switch (prev) {
        case (?p) if (id <= p) { continue scan };
        case null {};
      };
      if (collected >= limit) break scan;
      List.add<Nat>(result, id);
      collected += 1;
    };
    List.toArray(result);
  };

  public func tokensOf(
    balances : Map.Map<Principal, Set.Set<Nat>>,
    account  : ICRC7.Account,
    prev     : ?Nat,
    take     : ?Nat,
  ) : [Nat] {
    let normalized = normalizeAccount(account);
    if (normalized.subaccount != null) return [];
    switch (balances.get(normalized.owner)) {
      case (?set) paginateSet(set, prev, take);
      case null  [];
    };
  };

  func effectiveLimit(take : ?Nat) : Nat {
    switch take {
      case null DEFAULT_TAKE;
      case (?n) if (n > MAX_TAKE) MAX_TAKE else n;
    };
  };
};

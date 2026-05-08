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
import Nat64 "mo:core/Nat64";
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

  // ── Phase 3.3 transfer helpers ────────────────────────────────────────────
  //
  // Pure validation + canonical hashing + bounded dedup buffer. State maps
  // and the cursor live in main.mo; this module owns only the logic. The
  // SOLE-entry-point invariant for ownership mutation (assignOwnership above)
  // is enforced by the mixin: validateTransferArg runs first, then the mixin
  // calls assignOwnership; nothing else writes the maps.

  // ICRC-7 spec windows; consumed by validateTransferArg below and surfaced
  // through the icrc7_tx_window / icrc7_permitted_drift query getters.
  // Pre-computed because Motoko forbids non-static expressions at module level.
  public let TX_WINDOW_NS       : Nat = 86_400_000_000_000; // 24 * 60 * 60 * 1e9
  public let PERMITTED_DRIFT_NS : Nat = 120_000_000_000;    //  2 * 60 * 1e9
  public let MAX_MEMO_BYTES     : Nat = 32;
  public let RECENT_TX_CAP      : Nat = 1000;

  // FIFO cursor for the bounded dedup buffer. `oldest` is the slot index of
  // the next entry to evict; `next` is the slot of the next insertion. Both
  // are monotonically increasing — eviction does not compact the index space.
  // The live count is `next - oldest`; once it reaches RECENT_TX_CAP, every
  // insert evicts one entry from the oldest slot.
  public type DedupCursor = { var oldest : Nat; var next : Nat };

  // ── Validation ────────────────────────────────────────────────────────────
  //
  // Pure: returns the spec-shaped TransferError on failure. Does not mutate
  // anything. Single source of truth for the per-element check order in
  // icrc7_transfer.
  //
  // `now` is the canister's current time in nanoseconds (Nat). The mixin
  // computes it once per batch via `Int.abs(Time.now())` so all batch
  // elements see a consistent "now".
  public func validateTransferArg(
    args         : ICRC7.TransferArgs,
    caller       : Principal,
    currentOwner : ?ICRC7.Account,
    now          : Nat,
  ) : Result.Result<(), ICRC7.TransferError> {
    let owner = switch currentOwner {
      case null { return #err(#NonExistingTokenId) };
      case (?o) o;
    };

    // Caller must be the direct owner. Phase 3.4 widens this to approved
    // operators; for now, only the owner principal itself can transfer.
    // The from_subaccount in the arg must match the owner's subaccount
    // after normalization (null and 32-zero-bytes are equivalent).
    if (not Principal.equal(caller, owner.owner)) {
      return #err(#Unauthorized);
    };
    let fromSub = normalizeSubaccount(args.from_subaccount);
    let ownerSub = normalizeSubaccount(owner.subaccount);
    let subsMatch = switch (fromSub, ownerSub) {
      case (null, null) true;
      case (?a, ?b) Blob.equal(a, b);
      case _ false;
    };
    if (not subsMatch) {
      return #err(#Unauthorized);
    };

    // Recipient must not be the anonymous principal; self-transfers are
    // rejected as InvalidRecipient (per ICRC-7 conformance tests — a no-op
    // transfer wastes a block index and confuses dedup state).
    if (Principal.isAnonymous(args.to.owner)) {
      return #err(#InvalidRecipient);
    };
    if (accountsEqual(args.to, owner)) {
      return #err(#InvalidRecipient);
    };

    switch (args.memo) {
      case null {};
      case (?b) {
        if (Blob.toArray(b).size() > MAX_MEMO_BYTES) {
          return #err(#GenericError({
            error_code = 1;
            message    = "memo exceeds 32 bytes";
          }));
        };
      };
    };

    // created_at_time is the spec's dedup window key. If unset, no dedup
    // window applies (and no Duplicate check). If set, validate it falls
    // inside [now - TX_WINDOW, now + PERMITTED_DRIFT].
    switch (args.created_at_time) {
      case null {};
      case (?t) {
        let createdAt = Nat64.toNat(t);
        if (createdAt > now + PERMITTED_DRIFT_NS) {
          return #err(#CreatedInFuture { ledger_time = Nat64.fromNat(now) });
        };
        // Nat subtraction below is guarded by `now > createdAt` — the M0155
        // warning is a static-analysis false positive; the runtime can't trap.
        if (now > createdAt and now - createdAt > TX_WINDOW_NS) {
          return #err(#TooOld);
        };
      };
    };

    #ok;
  };

  // ── Canonical hash for dedup ──────────────────────────────────────────────
  //
  // Length-prefixed binary encoding so distinct args cannot collide via
  // field-boundary ambiguity (which would happen with a separator-only
  // scheme since Principal/memo bytes can contain any byte value).
  //
  //   [4-byte caller-len BE]  [caller bytes]
  //   [8-byte token_id BE]
  //   [4-byte to.owner-len BE][to.owner bytes]
  //   [1-byte to-sub-flag]    [32 bytes if flag=1]
  //   [1-byte from-sub-flag]  [32 bytes if flag=1]
  //   [4-byte memo-len BE]    [memo bytes]
  //   [1-byte created-at-flag][8 bytes if flag=1]
  //
  // Subaccounts are normalized first so null and 32-zero collapse to the
  // same encoding. token_id is fixed at 8 bytes — far above the collection
  // cap (8888 fits in 13 bits), and ICRC-7 token_ids are unbounded Nat in
  // principle but the cap keeps this safe.
  public func computeTxHash(caller : Principal, args : ICRC7.TransferArgs) : Blob {
    let buf = List.empty<Nat8>();
    appendLengthPrefixed(buf, Principal.toBlob(caller));
    appendNat64BE(buf, Nat64.fromNat(args.token_id));
    appendLengthPrefixed(buf, Principal.toBlob(args.to.owner));
    appendOptSubaccount(buf, args.to.subaccount);
    appendOptSubaccount(buf, args.from_subaccount);
    switch (args.memo) {
      case null { appendUint32BE(buf, 0) };
      case (?m) { appendLengthPrefixed(buf, m) };
    };
    switch (args.created_at_time) {
      case null { List.add(buf, 0 : Nat8) };
      case (?t) {
        List.add(buf, 1 : Nat8);
        appendNat64BE(buf, t);
      };
    };
    Blob.fromArray(List.toArray(buf));
  };

  func appendLengthPrefixed(buf : List.List<Nat8>, b : Blob) {
    let bytes = Blob.toArray(b);
    appendUint32BE(buf, bytes.size());
    for (byte in bytes.vals()) { List.add(buf, byte) };
  };

  func appendOptSubaccount(buf : List.List<Nat8>, sub : ?Blob) {
    switch (normalizeSubaccount(sub)) {
      case null { List.add(buf, 0 : Nat8) };
      case (?b) {
        List.add(buf, 1 : Nat8);
        for (byte in Blob.toArray(b).vals()) { List.add(buf, byte) };
      };
    };
  };

  func appendUint32BE(buf : List.List<Nat8>, n : Nat) {
    List.add(buf, Nat8.fromNat((n / 0x1000000) % 0x100));
    List.add(buf, Nat8.fromNat((n / 0x10000) % 0x100));
    List.add(buf, Nat8.fromNat((n / 0x100) % 0x100));
    List.add(buf, Nat8.fromNat(n % 0x100));
  };

  func appendNat64BE(buf : List.List<Nat8>, n : Nat64) {
    var i : Nat = 8;
    while (i > 0) {
      i -= 1;
      let shift : Nat64 = Nat64.fromNat(i * 8);
      List.add(buf, Nat8.fromNat(Nat64.toNat((n >> shift) & 0xFF)));
    };
  };

  // ── Dedup buffer ──────────────────────────────────────────────────────────
  //
  // O(1) lookup via the hash→blockIndex map, O(1) FIFO eviction via a
  // parallel insertion-ordered map keyed by cursor slot. Capacity is
  // RECENT_TX_CAP (1000); on overflow the oldest slot is evicted.
  //
  // Both maps are transient in main.mo: tx_window is 24h and a canister
  // upgrade typically takes seconds, so dropping the dedup state at
  // upgrade is acceptable for the Phase 3 minimal impl. Phase 4 replaces
  // this with a windowed eviction over the proper ICRC-3 transaction log.

  public func checkDedup(lookup : Map.Map<Blob, Nat>, hash : Blob) : ?Nat {
    lookup.get(hash);
  };

  public func recordRecentTx(
    lookup     : Map.Map<Blob, Nat>,
    order      : Map.Map<Nat, Blob>,
    cursor     : DedupCursor,
    hash       : Blob,
    blockIndex : Nat,
  ) {
    // Nat subtraction below is safe by the cursor invariant `next >= oldest`
    // (both start at 0; oldest only advances inside this function and never
    // past `next`). M0155 warning is a static-analysis false positive.
    let live = cursor.next - cursor.oldest;
    if (live >= RECENT_TX_CAP) {
      switch (order.get(cursor.oldest)) {
        case (?oldHash) {
          ignore lookup.delete(oldHash);
          ignore order.delete(cursor.oldest);
        };
        case null {
          // Cursor advanced past an empty slot — invariant violation; trap
          // loudly so the bug surfaces (means recordRecentTx and the cursor
          // got out of sync somewhere).
          Runtime.trap(
            "recordRecentTx invariant violation: cursor.oldest=" #
            Nat.toText(cursor.oldest) # " has no entry in order map"
          );
        };
      };
      cursor.oldest += 1;
    };
    lookup.add(hash, blockIndex);
    order.add(cursor.next, hash);
    cursor.next += 1;
  };
};

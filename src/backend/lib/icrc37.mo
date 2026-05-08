// lib/icrc37.mo
//
// ICRC-37 approval state helpers + canonical hashing for dedup. Approval
// storage is a nested map: tokenId → (spender principal → ApprovalInfo).
// Inner-map key is the spender's PRINCIPAL (not full Account) — this is a
// deliberate Phase 3 simplification documented in PROJECT_CONTEXT.md
// "ICRC-37 implementation rules" Q1: subaccount-keyed approvals are not
// observed in practice and would double the nested-map depth without a
// concrete use case.
//
// SOLE-entry-point invariant for approval mutations: addApproval /
// removeApproval / removeAllApprovals below are the only call sites that
// write the nested map. Mixin code MUST NOT touch the map directly.
//
// Phase 3.4 deliverable.

import Blob "mo:core/Blob";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Nat64 "mo:core/Nat64";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import ICRC7 "../types/icrc7";
import ICRC37 "../types/icrc37";
import IcrcLib "icrc7";

module {
  public type ApprovalsMap = Map.Map<Nat, Map.Map<Principal, ICRC37.ApprovalInfo>>;

  public func empty() : ApprovalsMap {
    Map.empty<Nat, Map.Map<Principal, ICRC37.ApprovalInfo>>();
  };

  // ── Mutation helpers ──────────────────────────────────────────────────────

  // Adds or replaces an approval. Caller must have validated authorization
  // and structure first (see validateApproveArg below).
  public func addApproval(
    approvals    : ApprovalsMap,
    tokenId      : Nat,
    approvalInfo : ICRC37.ApprovalInfo,
  ) {
    let inner = switch (approvals.get(tokenId)) {
      case (?m) m;
      case null {
        let newMap = Map.empty<Principal, ICRC37.ApprovalInfo>();
        approvals.add(tokenId, newMap);
        newMap;
      };
    };
    inner.add(approvalInfo.spender.owner, approvalInfo);
  };

  // Removes a specific (tokenId, spender principal) approval. Returns true
  // if an approval was actually removed; false if none existed. Cleans up
  // the inner map when it becomes empty so getTokenApprovals iteration
  // stays cheap.
  public func removeApproval(
    approvals : ApprovalsMap,
    tokenId   : Nat,
    spender   : Principal,
  ) : Bool {
    switch (approvals.get(tokenId)) {
      case null false;
      case (?inner) {
        let removed = inner.delete(spender);
        if (inner.size() == 0) {
          ignore approvals.delete(tokenId);
        };
        removed;
      };
    };
  };

  // Drops all approvals for a token. Called by the transfer methods after
  // a successful ownership change — the new owner did not grant the prior
  // approvals and they must not carry over (ICRC-37 §"Approval lifecycle").
  // Returns the count revoked.
  public func removeAllApprovals(
    approvals : ApprovalsMap,
    tokenId   : Nat,
  ) : Nat {
    switch (approvals.get(tokenId)) {
      case null 0;
      case (?inner) {
        let count = inner.size();
        ignore approvals.delete(tokenId);
        count;
      };
    };
  };

  // ── Read helpers ──────────────────────────────────────────────────────────

  // True iff (tokenId, spender) has an approval that hasn't expired.
  // `now` is canister time in nanoseconds (Nat). Expiry comparison is
  // strict: an approval whose expires_at exactly equals now is treated
  // as expired (per spec — the approval is valid up to but not including
  // the expiry timestamp).
  public func isApproved(
    approvals : ApprovalsMap,
    tokenId   : Nat,
    spender   : Principal,
    now       : Nat,
  ) : Bool {
    switch (approvals.get(tokenId)) {
      case null false;
      case (?inner) {
        switch (inner.get(spender)) {
          case null false;
          case (?info) {
            switch (info.expires_at) {
              case null true;
              case (?expiry) Nat64.toNat(expiry) > now;
            };
          };
        };
      };
    };
  };

  // Paginated approval listing for a token. Cursor is a TokenApproval
  // (start AFTER its spender principal in iteration order). Cap is shared
  // with the ICRC-7 take cap (1000). Uses Principal.compare on the inner
  // Map's natural key order — deterministic across calls as long as the
  // inner map isn't mutated between pages.
  public func getTokenApprovals(
    approvals : ApprovalsMap,
    tokenId   : Nat,
    prev      : ?ICRC37.TokenApproval,
    take      : ?Nat,
  ) : [ICRC37.TokenApproval] {
    switch (approvals.get(tokenId)) {
      case null [];
      case (?inner) {
        let limit = effectiveLimit(take);
        let result = List.empty<ICRC37.TokenApproval>();
        let prevPrincipal : ?Principal = switch prev {
          case null null;
          case (?p) ?p.approval_info.spender.owner;
        };
        var collected : Nat = 0;
        label scan for ((p, info) in inner.entries()) {
          switch prevPrincipal {
            case (?prev_p) {
              if (Principal.compare(p, prev_p) != #greater) continue scan;
            };
            case null {};
          };
          if (collected >= limit) break scan;
          List.add<ICRC37.TokenApproval>(result, { token_id = tokenId; approval_info = info });
          collected += 1;
        };
        List.toArray(result);
      };
    };
  };

  func effectiveLimit(take : ?Nat) : Nat {
    switch take {
      case null IcrcLib.DEFAULT_TAKE;
      case (?n) if (n > IcrcLib.MAX_TAKE) IcrcLib.MAX_TAKE else n;
    };
  };

  // ── Validation ────────────────────────────────────────────────────────────
  //
  // All three validators are PURE: they don't read the approvals map; they
  // only check structural validity + spec time-window + caller-vs-owner +
  // memo size. The mixin handles spender-approval lookup for transfer_from.

  public func validateApproveArg(
    arg          : ICRC37.ApproveTokenArg,
    caller       : Principal,
    currentOwner : ?ICRC7.Account,
    now          : Nat,
  ) : Result.Result<ICRC7.Account, ICRC37.ApproveTokenError> {
    let owner = switch currentOwner {
      case null { return #err(#NonExistingTokenId) };
      case (?o) o;
    };

    // Approve: only the direct owner can grant approvals (operators can't
    // re-grant). Approval delegation chains aren't part of ICRC-37.
    if (not Principal.equal(caller, owner.owner)) {
      return #err(#Unauthorized);
    };
    let fromSub = IcrcLib.normalizeSubaccount(arg.approval_info.from_subaccount);
    let ownerSub = IcrcLib.normalizeSubaccount(owner.subaccount);
    let subsMatch = switch (fromSub, ownerSub) {
      case (null, null) true;
      case (?a, ?b) Blob.equal(a, b);
      case _ false;
    };
    if (not subsMatch) {
      return #err(#Unauthorized);
    };

    // Self-approval: can't approve the owner as a spender of their own
    // token (no-op approval; spec rejects with InvalidSpender).
    if (Principal.equal(arg.approval_info.spender.owner, owner.owner)) {
      return #err(#InvalidSpender);
    };

    switch (arg.approval_info.memo) {
      case null {};
      case (?b) {
        if (Blob.toArray(b).size() > IcrcLib.MAX_MEMO_BYTES) {
          return #err(#GenericError({
            error_code = 1;
            message    = "memo exceeds 32 bytes";
          }));
        };
      };
    };

    switch (arg.approval_info.created_at_time) {
      case null {};
      case (?t) {
        let createdAt = Nat64.toNat(t);
        if (createdAt > now + IcrcLib.PERMITTED_DRIFT_NS) {
          return #err(#CreatedInFuture { ledger_time = Nat64.fromNat(now) });
        };
        // Nat subtraction guarded by `now > createdAt`; M0155 false positive.
        if (now > createdAt and now - createdAt > IcrcLib.TX_WINDOW_NS) {
          return #err(#TooOld);
        };
      };
    };

    #ok(owner);
  };

  // Validates a transfer_from arg's structural parts. Spender authorization
  // (caller must be approved for tokenId) is the mixin's responsibility —
  // this helper takes the auth result as a Bool and only enforces it.
  public func validateTransferFromArg(
    arg                : ICRC37.TransferFromArg,
    isApprovedSpender  : Bool,
    currentOwner       : ?ICRC7.Account,
    now                : Nat,
  ) : Result.Result<ICRC7.Account, ICRC37.TransferFromError> {
    let owner = switch currentOwner {
      case null { return #err(#NonExistingTokenId) };
      case (?o) o;
    };

    if (not isApprovedSpender) {
      return #err(#Unauthorized);
    };

    // The from arg must match the current owner exactly (after subaccount
    // normalization). Defense against transfer_from with a stale `from`
    // claim — the approval may still be valid but the token has moved.
    if (not IcrcLib.accountsEqual(arg.from, owner)) {
      return #err(#Unauthorized);
    };

    if (Principal.isAnonymous(arg.to.owner)) {
      return #err(#InvalidRecipient);
    };
    if (IcrcLib.accountsEqual(arg.to, owner)) {
      return #err(#InvalidRecipient);
    };

    switch (arg.memo) {
      case null {};
      case (?b) {
        if (Blob.toArray(b).size() > IcrcLib.MAX_MEMO_BYTES) {
          return #err(#GenericError({
            error_code = 1;
            message    = "memo exceeds 32 bytes";
          }));
        };
      };
    };

    switch (arg.created_at_time) {
      case null {};
      case (?t) {
        let createdAt = Nat64.toNat(t);
        if (createdAt > now + IcrcLib.PERMITTED_DRIFT_NS) {
          return #err(#CreatedInFuture { ledger_time = Nat64.fromNat(now) });
        };
        // Nat subtraction guarded by `now > createdAt`; M0155 false positive.
        if (now > createdAt and now - createdAt > IcrcLib.TX_WINDOW_NS) {
          return #err(#TooOld);
        };
      };
    };

    #ok(owner);
  };

  // Validates a revoke arg. Caller must be the current owner; from_subaccount
  // must match owner.subaccount; structural checks same as approve.
  public func validateRevokeArg(
    arg          : ICRC37.RevokeTokenApprovalArg,
    caller       : Principal,
    currentOwner : ?ICRC7.Account,
    now          : Nat,
  ) : Result.Result<ICRC7.Account, ICRC37.RevokeTokenApprovalError> {
    let owner = switch currentOwner {
      case null { return #err(#NonExistingTokenId) };
      case (?o) o;
    };
    if (not Principal.equal(caller, owner.owner)) {
      return #err(#Unauthorized);
    };
    let fromSub = IcrcLib.normalizeSubaccount(arg.from_subaccount);
    let ownerSub = IcrcLib.normalizeSubaccount(owner.subaccount);
    let subsMatch = switch (fromSub, ownerSub) {
      case (null, null) true;
      case (?a, ?b) Blob.equal(a, b);
      case _ false;
    };
    if (not subsMatch) {
      return #err(#Unauthorized);
    };

    switch (arg.memo) {
      case null {};
      case (?b) {
        if (Blob.toArray(b).size() > IcrcLib.MAX_MEMO_BYTES) {
          return #err(#GenericError({
            error_code = 1;
            message    = "memo exceeds 32 bytes";
          }));
        };
      };
    };

    switch (arg.created_at_time) {
      case null {};
      case (?t) {
        let createdAt = Nat64.toNat(t);
        if (createdAt > now + IcrcLib.PERMITTED_DRIFT_NS) {
          return #err(#CreatedInFuture { ledger_time = Nat64.fromNat(now) });
        };
        // Nat subtraction guarded by `now > createdAt`; M0155 false positive.
        if (now > createdAt and now - createdAt > IcrcLib.TX_WINDOW_NS) {
          return #err(#TooOld);
        };
      };
    };

    #ok(owner);
  };

  // ── Canonical hashes for dedup ────────────────────────────────────────────
  //
  // Each method writes a method-tag byte first so an approve and a transfer
  // with otherwise-identical args produce different hashes (defense in depth;
  // length-prefixed encoding alone already prevents collision via field
  // structure, but the tag makes it visually obvious in debugging).
  //
  //   0x01 = transfer (in lib/icrc7.mo)
  //   0x02 = approve
  //   0x03 = transfer_from
  //   0x04 = revoke

  public func computeApproveHash(caller : Principal, arg : ICRC37.ApproveTokenArg) : Blob {
    let buf = List.empty<Nat8>();
    List.add(buf, 0x02 : Nat8);
    IcrcLib.appendLengthPrefixed(buf, Principal.toBlob(caller));
    IcrcLib.appendNat64BE(buf, Nat64.fromNat(arg.token_id));
    IcrcLib.appendLengthPrefixed(buf, Principal.toBlob(arg.approval_info.spender.owner));
    IcrcLib.appendOptSubaccount(buf, arg.approval_info.spender.subaccount);
    IcrcLib.appendOptSubaccount(buf, arg.approval_info.from_subaccount);
    IcrcLib.appendOptNat64(buf, arg.approval_info.expires_at);
    IcrcLib.appendOptBlob(buf, arg.approval_info.memo);
    IcrcLib.appendOptNat64(buf, arg.approval_info.created_at_time);
    Blob.fromArray(List.toArray(buf));
  };

  public func computeTransferFromHash(caller : Principal, arg : ICRC37.TransferFromArg) : Blob {
    let buf = List.empty<Nat8>();
    List.add(buf, 0x03 : Nat8);
    IcrcLib.appendLengthPrefixed(buf, Principal.toBlob(caller));
    IcrcLib.appendOptSubaccount(buf, arg.spender_subaccount);
    IcrcLib.appendLengthPrefixed(buf, Principal.toBlob(arg.from.owner));
    IcrcLib.appendOptSubaccount(buf, arg.from.subaccount);
    IcrcLib.appendLengthPrefixed(buf, Principal.toBlob(arg.to.owner));
    IcrcLib.appendOptSubaccount(buf, arg.to.subaccount);
    IcrcLib.appendNat64BE(buf, Nat64.fromNat(arg.token_id));
    IcrcLib.appendOptBlob(buf, arg.memo);
    IcrcLib.appendOptNat64(buf, arg.created_at_time);
    Blob.fromArray(List.toArray(buf));
  };

  public func computeRevokeHash(caller : Principal, arg : ICRC37.RevokeTokenApprovalArg) : Blob {
    let buf = List.empty<Nat8>();
    List.add(buf, 0x04 : Nat8);
    IcrcLib.appendLengthPrefixed(buf, Principal.toBlob(caller));
    IcrcLib.appendOptAccount(buf, arg.spender);
    IcrcLib.appendOptSubaccount(buf, arg.from_subaccount);
    IcrcLib.appendNat64BE(buf, Nat64.fromNat(arg.token_id));
    IcrcLib.appendOptBlob(buf, arg.memo);
    IcrcLib.appendOptNat64(buf, arg.created_at_time);
    Blob.fromArray(List.toArray(buf));
  };
};

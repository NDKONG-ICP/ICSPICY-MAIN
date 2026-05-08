// types/icrc37.mo
//
// ICRC-37 (NFT approval extension) type definitions for IC SPICY's 8888-token
// collection. Layered on top of ICRC-7 — see types/icrc7.mo for shared types
// (Account, Subaccount, Value).
//
// Pinned spec:
//   repo:      github.com/dfinity/ICRC
//   commit:    860bfe5e03cf45b8c3d99caa4126916da55cca2f  (2024-07-07)
//   path:      ICRCs/ICRC-37/
//   .did blob: 9d54c5f9c0f6c6cf9d83a9c45a6f2b2e7a6c9e30   (TODO: re-pin from local checkout)
//   retrieved: 2026-05-08
//   status:    draft (NNS vote pending)
//
// Wire-format note: types here match the canonical .did exactly. ApprovalInfo
// does NOT include token_id; it is wrapped by ApproveTokenArg which adds the
// token_id field. Same applies to RevokeTokenApprovalArg etc. Any deviation
// would break standard ICRC-37 wallets/marketplaces calling our methods.
//
// Phase 3.4 scope: types only. Storage maps live in main.mo; methods land
// in mixins/icrc7-api.mo.

import ICRC7 "icrc7";

module {
  // ── Core approval types ───────────────────────────────────────────────────

  // Information about a single token approval. Spec-exact: token_id is NOT
  // a field here; it lives on the wrapping ApproveTokenArg / TokenApproval
  // / RevokeTokenApprovalArg records.
  public type ApprovalInfo = {
    from_subaccount : ?Blob;
    spender         : ICRC7.Account;
    memo            : ?Blob;
    expires_at      : ?Nat64;
    created_at_time : ?Nat64;
  };

  // Argument shape for icrc37_approve_tokens. One element per token-approval.
  public type ApproveTokenArg = {
    token_id      : Nat;
    approval_info : ApprovalInfo;
  };

  public type ApproveTokenError = {
    #InvalidSpender;
    #NonExistingTokenId;
    #Unauthorized;
    #TooOld;
    #CreatedInFuture   : { ledger_time : Nat64 };
    #Duplicate         : { duplicate_of : Nat };
    #GenericError      : { error_code : Nat; message : Text };
    #GenericBatchError : { error_code : Nat; message : Text };
  };

  public type ApproveTokenResult = {
    #Ok  : Nat;
    #Err : ApproveTokenError;
  };

  // ── Transfer-from ─────────────────────────────────────────────────────────

  public type TransferFromArg = {
    spender_subaccount : ?Blob;
    from               : ICRC7.Account;
    to                 : ICRC7.Account;
    token_id           : Nat;
    memo               : ?Blob;
    created_at_time    : ?Nat64;
  };

  public type TransferFromError = {
    #InvalidRecipient;
    #NonExistingTokenId;
    #Unauthorized;
    #TooOld;
    #CreatedInFuture   : { ledger_time : Nat64 };
    #Duplicate         : { duplicate_of : Nat };
    #GenericError      : { error_code : Nat; message : Text };
    #GenericBatchError : { error_code : Nat; message : Text };
  };

  public type TransferFromResult = {
    #Ok  : Nat;
    #Err : TransferFromError;
  };

  // ── Revocation ────────────────────────────────────────────────────────────
  //
  // `spender = null` revokes ALL approvals for the token; `spender = ?account`
  // revokes one specific approval. `from_subaccount` identifies which subaccount
  // of the caller's account is being revoked from — must match the owner's
  // subaccount of the token at revocation time.

  public type RevokeTokenApprovalArg = {
    spender         : ?ICRC7.Account;
    from_subaccount : ?Blob;
    token_id        : Nat;
    memo            : ?Blob;
    created_at_time : ?Nat64;
  };

  public type RevokeTokenApprovalError = {
    #ApprovalDoesNotExist;
    #NonExistingTokenId;
    #Unauthorized;
    #TooOld;
    #CreatedInFuture   : { ledger_time : Nat64 };
    #Duplicate         : { duplicate_of : Nat };
    #GenericError      : { error_code : Nat; message : Text };
    #GenericBatchError : { error_code : Nat; message : Text };
  };

  public type RevokeTokenApprovalResult = {
    #Ok  : Nat;
    #Err : RevokeTokenApprovalError;
  };

  // ── Read-side types ───────────────────────────────────────────────────────

  public type IsApprovedArg = {
    spender         : ICRC7.Account;
    from_subaccount : ?Blob;
    token_id        : Nat;
  };

  public type TokenApproval = {
    token_id      : Nat;
    approval_info : ApprovalInfo;
  };
};

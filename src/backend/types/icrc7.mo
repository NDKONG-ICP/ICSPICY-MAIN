// types/icrc7.mo
//
// ICRC-7 type definitions for IC SPICY's 8888-token NFT collection.
//
// These types match the ICRC-7 specification at the pinned commit:
//   repo:      github.com/dfinity/ICRC
//   commit:    860bfe5e03cf45b8c3d99caa4126916da55cca2f  (2024-07-07)
//   path:      ICRCs/ICRC-7/
//   .did blob: ad169520ceef22d0e5b2a3051933217d4564fffd
//   .md  blob: bfb2ad5130f42681116d2f5ce11f6ca23986ab32
//   retrieved: 2026-05-05
//   status:    accepted (NNS vote 2024-05-07)
//
// See PROJECT_CONTEXT.md "ICRC standards version pins" for the upgrade
// protocol if this spec ever evolves. DO NOT silently float — any spec
// drift requires a dedicated bump commit.
//
// Phase 3.1 scope: types only. Storage maps live in main.mo; methods land
// in 3.2 (queries) / 3.3 (transfer) / 3.4 (ICRC-37 approvals).

module {
  // ── Account ────────────────────────────────────────────────────────────────
  //
  // Per ICRC-7: subaccount is opt blob. By convention `subaccount = null` and
  // `subaccount = ?<32-zero-bytes>` denote the same logical identity.
  // Subaccount normalization to `null` happens at the storage helper boundary
  // in lib/icrc7.mo (added in Phase 3.2). DO NOT write directly to the
  // ownership maps — always go through the helper.

  public type Subaccount = Blob;

  public type Account = {
    owner : Principal;
    subaccount : ?Subaccount;
  };

  // ── Generic metadata Value (ICRC-3 compatible) ─────────────────────────────
  //
  // EXACT match for the spec's Value variant. Used in:
  //   - icrc7_collection_metadata return type
  //   - icrc7_token_metadata return type
  //   - certified envelope serialization (Phase 3.6)
  //
  // Variant order doesn't matter for Motoko (cases are identified by tag),
  // but the SET of cases must match the spec exactly. Adding, removing, or
  // renaming cases requires a spec-pin bump per the upgrade protocol.

  public type Value = {
    #Nat   : Nat;
    #Int   : Int;
    #Text  : Text;
    #Blob  : Blob;
    #Array : [Value];
    #Map   : [(Text, Value)];
  };

  // Collection-level metadata: a list of (key, value) pairs returned by
  // icrc7_collection_metadata.
  public type CollectionMetadata = [(Text, Value)];

  // ── Transfer ───────────────────────────────────────────────────────────────
  //
  // The ICRC-7 spec uses the singular type name `TransferArg`. We expose the
  // type as `TransferArgs` (plural) per the Phase 3.1 plan; the Candid wire
  // format depends on field names, not Motoko type-alias names, so this is
  // a documentation choice only and does not affect interoperability.
  // Rename here if spec-name parity becomes a documentation concern.

  public type TransferArgs = {
    from_subaccount : ?Blob;
    to              : Account;
    token_id        : Nat;
    memo            : ?Blob;
    created_at_time : ?Nat64;
  };

  public type TransferError = {
    #NonExistingTokenId;
    #InvalidRecipient;
    #Unauthorized;
    #TooOld;
    #CreatedInFuture   : { ledger_time : Nat64 };
    #Duplicate         : { duplicate_of : Nat };
    #GenericError      : { error_code : Nat; message : Text };
    #GenericBatchError : { error_code : Nat; message : Text };
  };

  public type TransferResult = {
    #Ok  : Nat;
    #Err : TransferError;
  };
};

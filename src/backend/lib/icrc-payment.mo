// lib/icrc-payment.mo
//
// ICRC-2 payment settlement helpers for Phase 4.
//
// Provides:
//   - PaymentToken type (ICP + ck-tokens)
//   - ledgerCanisterId(token) — mainnet canister IDs
//   - icrc2TransferFrom — pulls payment from buyer via icrc2_transfer_from
//
// Caller guard, state mutation order, and compensation logic are the
// responsibility of the calling mixin (payment-api.mo).
// See AGENTS.md "State changes around await" for the required pattern.

import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Nat "mo:core/Nat";

module {
  public type PaymentToken = {
    #ICP;
    #ckBTC;
    #ckETH;
    #ckUSDC;
    #ckUSDT;
  };

  public type TransferFromError = {
    #BadFee            : { expected_fee : Nat };
    #BadBurn           : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #InsufficientAllowance : { allowance : Nat };
    #TooOld;
    #CreatedInFuture   : { ledger_time : Nat64 };
    #Duplicate         : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError      : { error_code : Nat; message : Text };
  };

  // Minimal ICRC-2 ledger interface needed for payment settlement.
  public type ICRC2Ledger = actor {
    icrc1_fee : () -> async Nat;
    icrc2_transfer_from : ({
      spender_subaccount : ?Blob;
      from : { owner : Principal; subaccount : ?Blob };
      to   : { owner : Principal; subaccount : ?Blob };
      amount : Nat;
      fee    : ?Nat;
      memo   : ?Blob;
      created_at_time : ?Nat64;
    }) -> async { #Ok : Nat; #Err : TransferFromError };
  };

  // Mainnet canister IDs for each supported ICRC ledger.
  // For Phase 4 local smoke tests, only ICP is available on the local replica.
  public func ledgerCanisterId(token : PaymentToken) : Text {
    switch token {
      case (#ICP)    "ryjl3-tyaaa-aaaaa-aaaba-cai";
      case (#ckBTC)  "mxzaz-hqaaa-aaaar-qaada-cai";
      case (#ckETH)  "ss2fx-dyaaa-aaaar-qacoq-cai";
      case (#ckUSDC) "xevnm-gaaaa-aaaar-qafnq-cai";
      case (#ckUSDT) "cngnf-vqaaa-aaaar-qag4q-cai";
    };
  };

  public func getLedger(token : PaymentToken) : ICRC2Ledger {
    actor (ledgerCanisterId(token)) : ICRC2Ledger;
  };

  // Transfer `amount` base-units of `token` from buyer → receiver.
  // The buyer must have called icrc2_approve on the ledger to authorize
  // the backend canister (spender) before calling this.
  //
  // `created_at_time_ns` — pass the current time in nanoseconds as Nat64
  //   for deduplication. Use `?(Nat64.fromNat(Int.abs(Time.now())))` at call site.
  //   Pass null to skip dedup (acceptable for initial Phase 4 smoke tests).
  //
  // Returns #ok(blockIndex) on success, #err(humanReadableMessage) on failure.
  public func transferFrom(
    token               : PaymentToken,
    from                : Principal,
    to                  : Principal,
    amount              : Nat,
    created_at_time_ns  : ?Nat64,
    memo                : ?Blob,
  ) : async Result.Result<Nat, Text> {
    let ledger = getLedger(token);
    let fee    = await ledger.icrc1_fee();
    let result = await ledger.icrc2_transfer_from({
      spender_subaccount = null;
      from   = { owner = from; subaccount = null };
      to     = { owner = to;   subaccount = null };
      amount;
      fee    = ?fee;
      memo;
      created_at_time = created_at_time_ns;
    });
    switch result {
      case (#Ok(blockIndex)) #ok(blockIndex);
      case (#Err(e)) #err(transferFromErrorText(e));
    };
  };

  func transferFromErrorText(e : TransferFromError) : Text {
    switch e {
      case (#BadFee { expected_fee })             "Bad fee; expected " # Nat.toText(expected_fee);
      case (#BadBurn { min_burn_amount })          "Bad burn; min " # Nat.toText(min_burn_amount);
      case (#InsufficientFunds { balance })        "Insufficient funds; balance " # Nat.toText(balance);
      case (#InsufficientAllowance { allowance })  "Insufficient allowance; allowance " # Nat.toText(allowance);
      case (#TooOld)                               "Transaction too old";
      case (#CreatedInFuture _)                    "Created in future";
      case (#Duplicate { duplicate_of })           "Duplicate of block " # Nat.toText(duplicate_of);
      case (#TemporarilyUnavailable)               "Ledger temporarily unavailable";
      case (#GenericError { message; error_code = _ }) "Ledger error: " # message;
    };
  };
};

import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import List "mo:core/List";
import AccessControl "mo:caffeineai-authorization/access-control";
import TreasuryTypes "../types/treasury";
import TreasuryLib "../lib/treasury";
import Common "../types/common";

mixin (
  accessControlState : AccessControl.AccessControlState,
  treasuryState      : TreasuryTypes.TreasuryState,
  treasuryTxLog      : List.List<TreasuryTypes.TreasuryTransaction>,
  nextTreasuryTxId   : { var value : Nat },
) {

  /// Admin: get all treasury token balances.
  public query ({ caller }) func getTreasuryBalances() : async [TreasuryTypes.TreasuryBalance] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    TreasuryLib.getAllBalances(treasuryState);
  };

  /// Admin: get the balance for a single token.
  public query ({ caller }) func getTreasuryBalance(
    token : TreasuryTypes.TreasuryToken,
  ) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    TreasuryLib.getBalance_(treasuryState, token);
  };

  /// Admin: get the full treasury ledger (all transactions).
  public query ({ caller }) func getTreasuryLedger() : async [TreasuryTypes.TreasuryTransaction] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    TreasuryLib.getLedger(treasuryTxLog);
  };

  /// Admin: deposit funds into the treasury.
  public shared ({ caller }) func treasuryDeposit(
    token  : TreasuryTypes.TreasuryToken,
    amount : Nat,
    memo   : ?Text,
  ) : async TreasuryTypes.TreasuryTransaction {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    TreasuryLib.deposit(
      treasuryState,
      treasuryTxLog,
      nextTreasuryTxId,
      token,
      amount,
      ?caller,
      memo,
      null,
      Time.now(),
    );
  };

  /// Admin: withdraw funds from the treasury to an external principal.
  public shared ({ caller }) func treasuryWithdraw(
    token  : TreasuryTypes.TreasuryToken,
    amount : Nat,
    to     : Principal,
    memo   : ?Text,
  ) : async TreasuryTypes.TreasuryTransaction {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    TreasuryLib.withdraw(
      treasuryState,
      treasuryTxLog,
      nextTreasuryTxId,
      token,
      amount,
      to,
      memo,
      Time.now(),
    );
  };

  /// Admin: transfer funds within the treasury (e.g. between logical sub-accounts).
  public shared ({ caller }) func treasuryTransfer(
    token  : TreasuryTypes.TreasuryToken,
    amount : Nat,
    from   : Principal,
    to     : Principal,
    memo   : ?Text,
  ) : async TreasuryTypes.TreasuryTransaction {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    TreasuryLib.transfer(
      treasuryState,
      treasuryTxLog,
      nextTreasuryTxId,
      token,
      amount,
      from,
      to,
      memo,
      Time.now(),
    );
  };
};

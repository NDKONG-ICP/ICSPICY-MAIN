import Runtime "mo:core/Runtime";
import List "mo:core/List";
import TreasuryTypes "../types/treasury";
import Common "../types/common";

module {
  public type TxLog = List.List<TreasuryTypes.TreasuryTransaction>;

  // ── internal helpers ──

  func tokenToText(token : TreasuryTypes.TreasuryToken) : Text {
    switch token {
      case (#ICP)    "ICP";
      case (#ckBTC)  "ckBTC";
      case (#ckETH)  "ckETH";
      case (#ckUSDC) "ckUSDC";
      case (#ckUSDT) "ckUSDT";
    };
  };

  func readBalance(state : TreasuryTypes.TreasuryState, token : TreasuryTypes.TreasuryToken) : Nat {
    switch token {
      case (#ICP)    { state.icpBalance    };
      case (#ckBTC)  { state.ckbtcBalance  };
      case (#ckETH)  { state.ckethBalance  };
      case (#ckUSDC) { state.ckusdcBalance };
      case (#ckUSDT) { state.ckusdtBalance };
    };
  };

  func writeBalance(state : TreasuryTypes.TreasuryState, token : TreasuryTypes.TreasuryToken, amount : Nat) {
    switch token {
      case (#ICP)    { state.icpBalance    := amount };
      case (#ckBTC)  { state.ckbtcBalance  := amount };
      case (#ckETH)  { state.ckethBalance  := amount };
      case (#ckUSDC) { state.ckusdcBalance := amount };
      case (#ckUSDT) { state.ckusdtBalance := amount };
    };
  };

  func incrementBalance(state : TreasuryTypes.TreasuryState, token : TreasuryTypes.TreasuryToken, amount : Nat) {
    writeBalance(state, token, readBalance(state, token) + amount);
  };

  func decrementBalance(state : TreasuryTypes.TreasuryState, token : TreasuryTypes.TreasuryToken, amount : Nat) {
    let current = readBalance(state, token);
    if (current < amount) {
      Runtime.trap("Insufficient treasury balance for " # tokenToText(token));
    };
    writeBalance(state, token, current - amount);
  };

  func nextTxId(nextId : { var value : Nat }) : Text {
    let id = nextId.value;
    nextId.value += 1;
    "tx-" # id.toText();
  };

  /// Deposit a token amount into the treasury.
  public func deposit(
    state   : TreasuryTypes.TreasuryState,
    txLog   : TxLog,
    nextId  : { var value : Nat },
    token   : TreasuryTypes.TreasuryToken,
    amount  : Nat,
    from    : ?Principal,
    memo    : ?Text,
    offerId : ?Text,
    now     : Common.Timestamp,
  ) : TreasuryTypes.TreasuryTransaction {
    incrementBalance(state, token, amount);
    let tx : TreasuryTypes.TreasuryTransaction = {
      id             = nextTxId(nextId);
      tx_type        = #Deposit;
      token;
      amount_e8s     = amount;
      from_principal = from;
      to_principal   = null;
      memo;
      timestamp      = now;
      offer_id       = offerId;
    };
    txLog.add(tx);
    tx;
  };

  /// Withdraw a token amount from the treasury (admin only caller check is in mixin).
  public func withdraw(
    state  : TreasuryTypes.TreasuryState,
    txLog  : TxLog,
    nextId : { var value : Nat },
    token  : TreasuryTypes.TreasuryToken,
    amount : Nat,
    to     : Principal,
    memo   : ?Text,
    now    : Common.Timestamp,
  ) : TreasuryTypes.TreasuryTransaction {
    decrementBalance(state, token, amount);
    let tx : TreasuryTypes.TreasuryTransaction = {
      id             = nextTxId(nextId);
      tx_type        = #Withdrawal;
      token;
      amount_e8s     = amount;
      from_principal = null;
      to_principal   = ?to;
      memo;
      timestamp      = now;
      offer_id       = null;
    };
    txLog.add(tx);
    tx;
  };

  /// Transfer between treasury sub-accounts (admin only).
  public func transfer(
    state  : TreasuryTypes.TreasuryState,
    txLog  : TxLog,
    nextId : { var value : Nat },
    token  : TreasuryTypes.TreasuryToken,
    amount : Nat,
    from   : Principal,
    to     : Principal,
    memo   : ?Text,
    now    : Common.Timestamp,
  ) : TreasuryTypes.TreasuryTransaction {
    // Decrement then increment same token (logical transfer between sub-accounts)
    decrementBalance(state, token, amount);
    incrementBalance(state, token, amount);
    let tx : TreasuryTypes.TreasuryTransaction = {
      id             = nextTxId(nextId);
      tx_type        = #Transfer;
      token;
      amount_e8s     = amount;
      from_principal = ?from;
      to_principal   = ?to;
      memo;
      timestamp      = now;
      offer_id       = null;
    };
    txLog.add(tx);
    tx;
  };

  /// Settle an accepted offer into the treasury (buyer's funds go to treasury).
  public func settleOffer(
    state   : TreasuryTypes.TreasuryState,
    txLog   : TxLog,
    nextId  : { var value : Nat },
    token   : TreasuryTypes.TreasuryToken,
    amount  : Nat,
    buyer   : Principal,
    seller  : Principal,
    offerId : Text,
    now     : Common.Timestamp,
  ) : TreasuryTypes.TreasuryTransaction {
    incrementBalance(state, token, amount);
    let tx : TreasuryTypes.TreasuryTransaction = {
      id             = nextTxId(nextId);
      tx_type        = #OfferSettlement;
      token;
      amount_e8s     = amount;
      from_principal = ?buyer;
      to_principal   = ?seller;
      memo           = ?("Offer settlement: " # offerId);
      timestamp      = now;
      offer_id       = ?offerId;
    };
    txLog.add(tx);
    tx;
  };

  /// Return all balances as a flat array.
  public func getAllBalances(
    state : TreasuryTypes.TreasuryState,
  ) : [TreasuryTypes.TreasuryBalance] {
    [
      { token = #ICP;    balance_e8s = state.icpBalance    },
      { token = #ckBTC;  balance_e8s = state.ckbtcBalance  },
      { token = #ckETH;  balance_e8s = state.ckethBalance  },
      { token = #ckUSDC; balance_e8s = state.ckusdcBalance },
      { token = #ckUSDT; balance_e8s = state.ckusdtBalance },
    ]
  };

  /// Return the balance for a single token.
  public func getBalance_(
    state : TreasuryTypes.TreasuryState,
    token : TreasuryTypes.TreasuryToken,
  ) : Nat {
    readBalance(state, token)
  };

  /// Return the full ledger (all transactions).
  public func getLedger(
    txLog : TxLog,
  ) : [TreasuryTypes.TreasuryTransaction] {
    txLog.toArray()
  };
};

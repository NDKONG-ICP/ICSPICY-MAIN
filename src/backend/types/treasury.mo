import Common "common";

module {
  // Supported treasury tokens — each stored natively with its own balance
  public type TreasuryToken = {
    #ICP;
    #ckBTC;
    #ckETH;
    #ckUSDC;
    #ckUSDT;
  };

  // Transaction type classifying why funds moved
  public type TreasuryTxType = {
    #Deposit;
    #Withdrawal;
    #Transfer;
    #OfferSettlement;
  };

  // Per-token balance entry (balance is in the token's native base units)
  public type TreasuryBalance = {
    token      : TreasuryToken;
    balance_e8s : Nat;   // e8s for ICP/ckBTC, wei for ckETH, micro for ckUSDC/ckUSDT
  };

  // Immutable ledger entry for every treasury movement
  public type TreasuryTransaction = {
    id            : Text;
    tx_type       : TreasuryTxType;
    token         : TreasuryToken;
    amount_e8s    : Nat;
    from_principal : ?Principal;
    to_principal   : ?Principal;
    memo           : ?Text;
    timestamp      : Common.Timestamp;
    offer_id       : ?Text;         // populated when tx_type = #OfferSettlement
  };

  // Top-level treasury state record (stored in main.mo as named fields)
  public type TreasuryState = {
    // Balances keyed by a canonical token-name Text (e.g. "ICP", "ckBTC")
    // Using Map<Text, Nat> keeps it serialisable across upgrades.
    var icpBalance    : Nat;
    var ckbtcBalance  : Nat;
    var ckethBalance  : Nat;
    var ckusdcBalance : Nat;
    var ckusdtBalance : Nat;
  };
};

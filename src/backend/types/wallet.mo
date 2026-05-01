import Common "common";

module {
  public type WalletToken = {
    symbol : Text;
    name : Text;
    balance : Nat; // in smallest unit (e8s for ICP/ckBTC, etc.)
    decimals : Nat8;
    usdValue : Float; // approximate USD value of total balance
  };

  public type TxType = { #send; #receive };
  public type TxStatus = { #pending; #completed; #failed };

  public type WalletTransaction = {
    id : Text;
    tokenSymbol : Text;
    txType : TxType;
    amount : Nat;
    counterparty : Text;
    timestamp : Common.Timestamp;
    status : TxStatus;
  };

  public type SendTokenInput = {
    tokenSymbol : Text;
    recipientAddress : Text;
    amount : Nat;
  };

  // Per-principal wallet state stored in the canister
  public type WalletState = {
    var icp : Nat;     // e8s
    var ckbtc : Nat;   // satoshis
    var cketh : Nat;   // wei (scaled: 1e15 = 0.001 ETH)
    var ckusdc : Nat;  // micro-USDC (1e6 = 1 USDC)
    var ckusdt : Nat;  // micro-USDT (1e6 = 1 USDT)
  };
};

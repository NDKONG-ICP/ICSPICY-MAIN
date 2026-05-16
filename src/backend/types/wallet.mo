import Common "common";

// Ghost module — kept only to preserve stable memory compatibility with the
// `wallets` and `txLog` variables that exist in the pre-Phase-4 mainnet state.
// Do NOT use these types for new code. Will be cleaned up via explicit
// migration in a future phase once the stable variables can be dropped.
module {
  public type WalletToken = {
    symbol : Text;
    name : Text;
    balance : Nat;
    decimals : Nat8;
    usdValue : Float;
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

  public type WalletState = {
    var icp    : Nat;
    var ckbtc  : Nat;
    var cketh  : Nat;
    var ckusdc : Nat;
    var ckusdt : Nat;
  };
};

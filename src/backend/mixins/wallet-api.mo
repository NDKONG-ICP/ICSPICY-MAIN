import Map "mo:core/Map";
import List "mo:core/List";
import WalletTypes "../types/wallet";
import WalletLib "../lib/wallet";

mixin (
  wallets : Map.Map<Principal, WalletTypes.WalletState>,
  txLog   : List.List<WalletTypes.WalletTransaction>,
) {
  // Authenticated: get wallet balances for caller (initialises on first call)
  public shared ({ caller }) func getWalletBalances() : async [WalletTypes.WalletToken] {
    let state = switch (wallets.get(caller)) {
      case (?s) { s };
      case null {
        let s = WalletLib.initWallet();
        wallets.add(caller, s);
        s;
      };
    };
    WalletLib.getBalances(state);
  };

  // Authenticated: get last 20 transactions for caller, newest first
  public query ({ caller }) func getWalletTransactions() : async [WalletTypes.WalletTransaction] {
    WalletLib.getTransactions(txLog, caller);
  };

  // Authenticated: send tokens — simulates transfer, deducts balance, logs tx
  public shared ({ caller }) func sendToken(input : WalletTypes.SendTokenInput) : async { #ok : Text; #err : Text } {
    WalletLib.send(wallets, txLog, caller, input);
  };

  // Authenticated: return caller's wallet address (principal as text)
  public query ({ caller }) func getWalletAddress() : async Text {
    caller.toText();
  };
};

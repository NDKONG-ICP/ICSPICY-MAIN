import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import WalletTypes "../types/wallet";
import WalletLib "../lib/wallet";
import Principal "mo:core/Principal";

mixin (
  wallets : Map.Map<Principal, WalletTypes.WalletState>,
  txLog   : List.List<WalletTypes.WalletTransaction>,
) {
  // Authenticated: get wallet balances for caller (initialises on first call)
  public shared ({ caller }) func getWalletBalances() : async [WalletTypes.WalletToken] {
    if (caller.isAnonymous()) Runtime.trap("anonymous caller not allowed");
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
    if (caller.isAnonymous()) Runtime.trap("anonymous caller not allowed");
    WalletLib.send(wallets, txLog, caller, input);
  };

  // Authenticated: return caller's wallet address (principal as text)
  public query ({ caller }) func getWalletAddress() : async Text {
    caller.toText();
  };
};

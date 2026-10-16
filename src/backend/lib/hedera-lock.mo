// Hedera mirror twin lock subaccount (SHA-256 of label "hedera-lock").

import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Sha256 "mo:sha2/Sha256";
import ICRC7 "../types/icrc7";
import IcrcLib "../lib/icrc7";

module {
  public func lockSubaccount() : Blob {
    Sha256.fromBlob(#sha256, Text.encodeUtf8("hedera-lock"));
  };

  public func lockAccount(canister : Principal) : ICRC7.Account {
    {
      owner = canister;
      subaccount = ?lockSubaccount();
    };
  };

  public func isLockAccount(acc : ICRC7.Account, canister : Principal) : Bool {
    IcrcLib.accountsEqual(acc, lockAccount(canister));
  };
};

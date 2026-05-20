// lib/nft-pool.mo
//
// Random NFT assignment from the non-PepperHead pool for plant inventory.
// PepperHead range: token IDs 7839–8726 (pool IDs 7838–8725).

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import ICRC7 "../types/icrc7";
import ICRC7Lib "../lib/icrc7";

module {
  let PH_START : Nat = 7839;
  let PH_END : Nat = 8727;
  let MAX_TOKEN : Nat = 8888;

  func isPlantPoolToken(tokenId : Nat) : Bool {
    if (tokenId == 0 or tokenId > MAX_TOKEN) return false;
    tokenId < PH_START or tokenId >= PH_END;
  };

  func isCanisterOpenPool(acc : ICRC7.Account, canister : Principal) : Bool {
    Principal.equal(acc.owner, canister) and acc.subaccount == null;
  };

  /// Collect available non-PepperHead tokens owned by the canister (open pool).
  public func collectAvailable(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
  ) : [Nat] {
    var available : [Nat] = [];
    var tokenId : Nat = 1;
    while (tokenId <= MAX_TOKEN) {
      if (isPlantPoolToken(tokenId)) {
        switch (icrc7Owners.get(tokenId)) {
          case (?(acc)) {
            if (isCanisterOpenPool(acc, canister)) {
              available := Array.concat(available, [tokenId]);
            };
          };
          case null {};
        };
      };
      tokenId += 1;
    };
    available;
  };

  /// Pick a pseudo-random available token. Returns null if pool exhausted.
  public func pickRandomAvailableNft(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    entropy : Nat,
  ) : ?Nat {
    let available = collectAvailable(icrc7Owners, canister);
    if (available.size() == 0) return null;
    let idx = entropy % available.size();
    ?available[idx];
  };

  public func isPepperHeadToken(tokenId : Nat) : Bool {
    ICRC7Lib.isPepperHead(tokenId);
  };
};

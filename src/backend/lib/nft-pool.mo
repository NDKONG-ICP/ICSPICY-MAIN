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
    if (tokenId == 0) return false;
    if (tokenId >= 100_000) return false;
    if (tokenId > MAX_TOKEN) return false;
    tokenId < PH_START or tokenId >= PH_END;
  };

  func isCanisterOpenPool(acc : ICRC7.Account, canister : Principal) : Bool {
    Principal.equal(acc.owner, canister) and acc.subaccount == null;
  };

  func isExcluded(tokenId : Nat, exclude : [Nat]) : Bool {
    for (e in exclude.vals()) {
      if (e == tokenId) return true;
    };
    false;
  };

  /// Collect available non-PepperHead tokens owned by the canister (open pool).
  public func collectAvailable(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
  ) : [Nat] {
    collectAvailableExcluding(icrc7Owners, canister, []);
  };

  public func collectAvailableExcluding(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    exclude : [Nat],
  ) : [Nat] {
    var available : [Nat] = [];
    var tokenId : Nat = 1;
    while (tokenId <= MAX_TOKEN) {
      if (isPlantPoolToken(tokenId) and not isExcluded(tokenId, exclude)) {
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

  public func canisterOwnsToken(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    tokenId : Nat,
  ) : Bool {
    switch (icrc7Owners.get(tokenId)) {
      case (?(acc)) isCanisterOpenPool(acc, canister);
      case null false;
    };
  };

  /// Pick a pseudo-random available token. Returns null if pool exhausted.
  public func pickRandomAvailableNft(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    entropy : Nat,
    exclude : [Nat],
  ) : ?Nat {
    let available = collectAvailableExcluding(icrc7Owners, canister, exclude);
    if (available.size() == 0) return null;
    let idx = entropy % available.size();
    ?available[idx];
  };

  public func isPepperHeadToken(tokenId : Nat) : Bool {
    ICRC7Lib.isPepperHead(tokenId);
  };
};

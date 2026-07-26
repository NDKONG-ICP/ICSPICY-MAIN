// lib/plant-pool.mo — NIMS germination pool (PepperHeads 2001–8888, minus carve-outs).

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import ICRC7 "../types/icrc7";
import Common "../types/common";

module {
  public let PLANT_POOL_START : Nat = 2001;
  public let PLANT_POOL_END : Nat = 8888;

  public let QR_CARVE_START : Nat = 7845;
  public let QR_CARVE_END : Nat = 7890;
  public let COOP_CARVE_START : Nat = 7891;
  public let COOP_CARVE_END : Nat = 7978;
  public let GENESIS_CARVE_START : Nat = 7979;
  public let GENESIS_CARVE_END : Nat = 7987;

  /// Theoretical max assignable tokens if every ID in range were pool-owned and unbound.
  public let THEORETICAL_CEILING : Nat = 6745;

  public func isInPlantPoolRange(tokenId : Nat) : Bool {
    tokenId >= PLANT_POOL_START and tokenId <= PLANT_POOL_END;
  };

  public func isStaticCarveOut(tokenId : Nat) : Bool {
    (tokenId >= QR_CARVE_START and tokenId <= QR_CARVE_END)
    or (tokenId >= COOP_CARVE_START and tokenId <= COOP_CARVE_END)
    or (tokenId >= GENESIS_CARVE_START and tokenId <= GENESIS_CARVE_END);
  };

  func isCanisterOpenPool(acc : ICRC7.Account, canister : Principal) : Bool {
    Principal.equal(acc.owner, canister) and acc.subaccount == null;
  };

  func isProductReserved(
    tokenId : Nat,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
  ) : Bool {
    for ((_, tid) in productNftTokenIds.entries()) {
      if (tid == tokenId) return true;
    };
    false;
  };

  func isCoopDesignated(
    tokenId : Nat,
    coopDesignatedSeats : Map.Map<Nat, Bool>,
  ) : Bool {
    switch (coopDesignatedSeats.get(tokenId)) {
      case (?true) true;
      case _ false;
    };
  };

  func isBoundToPlant(
    tokenId : Nat,
    plantByNftId : Map.Map<Nat, Nat>,
    nftTokenPlantIds : Map.Map<Nat, Nat>,
  ) : Bool {
    switch (plantByNftId.get(tokenId)) {
      case (?_) true;
      case null {
        switch (nftTokenPlantIds.get(tokenId)) {
          case (?_) true;
          case null false;
        };
      };
    };
  };

  public func isAssignablePlantPoolToken(
    tokenId : Nat,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    plantByNftId : Map.Map<Nat, Nat>,
    nftTokenPlantIds : Map.Map<Nat, Nat>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    coopDesignatedSeats : Map.Map<Nat, Bool>,
  ) : Bool {
    if (not isInPlantPoolRange(tokenId)) return false;
    if (isStaticCarveOut(tokenId)) return false;
    if (isCoopDesignated(tokenId, coopDesignatedSeats)) return false;
    if (isBoundToPlant(tokenId, plantByNftId, nftTokenPlantIds)) return false;
    if (isProductReserved(tokenId, productNftTokenIds)) return false;
    switch (icrc7Owners.get(tokenId)) {
      case (?(acc)) isCanisterOpenPool(acc, canister);
      case null false;
    };
  };

  public func collectAssignable(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    plantByNftId : Map.Map<Nat, Nat>,
    nftTokenPlantIds : Map.Map<Nat, Nat>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    coopDesignatedSeats : Map.Map<Nat, Bool>,
  ) : [Nat] {
    var available : [Nat] = [];
    var tokenId = PLANT_POOL_START;
    while (tokenId <= PLANT_POOL_END) {
      if (
        isAssignablePlantPoolToken(
          tokenId,
          icrc7Owners,
          canister,
          plantByNftId,
          nftTokenPlantIds,
          productNftTokenIds,
          coopDesignatedSeats,
        )
      ) {
        available := Array.concat(available, [tokenId]);
      };
      tokenId += 1;
    };
    available;
  };

  public func countAssignable(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    plantByNftId : Map.Map<Nat, Nat>,
    nftTokenPlantIds : Map.Map<Nat, Nat>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    coopDesignatedSeats : Map.Map<Nat, Bool>,
  ) : Nat {
    collectAssignable(
      icrc7Owners,
      canister,
      plantByNftId,
      nftTokenPlantIds,
      productNftTokenIds,
      coopDesignatedSeats,
    ).size();
  };

  public func pickRandom(
    available : [Nat],
    entropy : Nat,
  ) : ?Nat {
    if (available.size() == 0) return null;
    let idx = entropy % available.size();
    ?available[idx];
  };

  public func reservedProductTokenIds(
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
  ) : [Nat] {
    Iter.toArray(
      Iter.map<(Nat, Nat), Nat>(
        productNftTokenIds.entries(),
        func((_, tid)) = tid,
      ),
    );
  };
};

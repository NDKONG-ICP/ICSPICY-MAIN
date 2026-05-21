import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import AdminTypes "../types/admin";
import ICRC7Lib "../lib/icrc7";
import ICRC7 "../types/icrc7";
import Common "../types/common";

module {
  func poolAccount(canister : Principal) : ICRC7.Account {
    { owner = canister; subaccount = null }
  };

  func ownerLabel(owner : ICRC7.Account, canister : Principal) : Text {
    if (Principal.equal(owner.owner, canister) and owner.subaccount == null) {
      "Canister Pool"
    } else {
      Principal.toText(owner.owner)
    }
  };

  func rarityLabel(tokenId : Nat) : Text {
    if (tokenId >= 7839 and tokenId <= 7888) "Founder"
    else if (tokenId >= 7889 and tokenId <= 8726) "PepperHead"
    else if (tokenId >= 1 and tokenId <= 5000) "Common"
    else if (tokenId >= 5001 and tokenId <= 7888) "Uncommon"
    else if (tokenId >= 8727 and tokenId <= 8888) "Rare"
    else "Unknown"
  };

  public func computeStats(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    canister : Principal,
  ) : AdminTypes.Icrc7PoolStats {
    let pool = poolAccount(canister);
    var inPool : Nat = 0;
    var sold : Nat = 0;
    var missing : Nat = 0;
    var phTotal : Nat = 0;
    var phInPool : Nat = 0;
    var phSold : Nat = 0;
    var id : Nat = 1;
    while (id <= 8888) {
      let isPh = ICRC7Lib.isPepperHead(id);
      if (isPh) phTotal += 1;
      switch (icrc7Owners.get(id)) {
        case null { missing += 1 };
        case (?owner) {
          let inCanister = ICRC7Lib.accountsEqual(owner, pool);
          if (inCanister) {
            inPool += 1;
            if (isPh) phInPool += 1;
          } else {
            sold += 1;
            if (isPh) phSold += 1;
          };
        };
      };
      id += 1;
    };
    var assignedPlants : Nat = 0;
    for ((_, _) in nftTokenPlantIds.entries()) { assignedPlants += 1 };
    var assignedProducts : Nat = 0;
    for ((_, _) in productNftTokenIds.entries()) { assignedProducts += 1 };
    {
      total = 8888;
      in_canister_pool = inPool;
      assigned_to_plants = assignedPlants;
      assigned_to_products = assignedProducts;
      sold_to_customers = sold;
      pepperhead_total = phTotal;
      pepperhead_in_pool = phInPool;
      pepperhead_sold = phSold;
      missing_owner = missing;
    }
  };

  func matchesTokenFilter(
    tokenId : Nat,
    owner : ?ICRC7.Account,
    canister : Principal,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    filter : AdminTypes.Icrc7TokenFilter,
  ) : Bool {
    let pool = poolAccount(canister);
    let isPh = ICRC7Lib.isPepperHead(tokenId);
    let inPool = switch (owner) {
      case null false;
      case (?o) ICRC7Lib.accountsEqual(o, pool);
    };
    let assigned = nftTokenPlantIds.get(tokenId) != null or
      Iter.any(productNftTokenIds.entries(), func((_, tid) : (Common.ProductId, Nat)) : Bool { tid == tokenId });
    switch (filter) {
      case (#All) true;
      case (#Available) inPool;
      case (#Assigned) assigned;
      case (#Sold) {
        switch (owner) {
          case null false;
          case (?o) not ICRC7Lib.accountsEqual(o, pool);
        }
      };
      case (#PepperHead) isPh;
      case (#Missing) owner == null;
    }
  };

  public func listTokens(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    canister : Principal,
    filter : AdminTypes.Icrc7TokenFilter,
    offset : Nat,
    limit : Nat,
  ) : [AdminTypes.Icrc7TokenAdminPublic] {
    var out : [AdminTypes.Icrc7TokenAdminPublic] = [];
    var skipped : Nat = 0;
    var id : Nat = 1;
    while (id <= 8888 and out.size() < limit) {
      let owner = icrc7Owners.get(id);
      if (matchesTokenFilter(id, owner, canister, nftTokenPlantIds, productNftTokenIds, filter)) {
        if (skipped < offset) {
          skipped += 1;
        } else {
          var productId : ?Common.ProductId = null;
          for ((pid, tid) in productNftTokenIds.entries()) {
            if (tid == id) { productId := ?pid };
          };
          let ownerText = switch (owner) {
            case null "Missing";
            case (?o) ownerLabel(o, canister);
          };
          let inPool = switch (owner) {
            case null false;
            case (?o) ICRC7Lib.accountsEqual(o, poolAccount(canister));
          };
          out := Array.concat(out, [{
            token_id = id;
            owner = ownerText;
            is_canister_pool = inPool;
            is_pepperhead = ICRC7Lib.isPepperHead(id);
            plant_id = nftTokenPlantIds.get(id);
            product_id = productId;
            rarity_label = rarityLabel(id);
          }]);
        };
      };
      id += 1;
    };
    out
  };

  public func findNextPoolToken(
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    startId : Nat,
    useRandomSeed : Nat,
  ) : ?Nat {
    let pool = poolAccount(canister);
    var probe : Nat = if (startId >= 1 and startId <= 8888) startId else 1;
    var tries : Nat = 0;
    while (tries < 8888) {
      switch (icrc7Owners.get(probe)) {
        case (?owner) {
          if (ICRC7Lib.accountsEqual(owner, pool) and not ICRC7Lib.isPepperHead(probe)) {
            return ?probe;
          };
        };
        case null {};
      };
      probe := if (probe >= 8888) 1 else probe + 1;
      if (useRandomSeed > 0 and tries == useRandomSeed % 200) {
        probe := ((probe + useRandomSeed) % 7888) + 1;
      };
      tries += 1;
    };
    null
  };
};

import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Result "mo:core/Result";
import ICRC7 "../types/icrc7";
import CoopTypes "../types/coop";
import Common "../types/common";
import PlantTypes "../types/plants";
import ICRC7Lib "./icrc7";

module {
  public let GROWER_TOKEN_START : Nat = 100_000;
  /// Exclusive upper bound — 200_000+ is reserved for soulbound achievement badges.
  public let GROWER_TOKEN_END : Nat = 200_000;
  public let MINTS_PER_HOUR : Nat = 20;
  /// Tray batch registration may mint up to this many grower tokens per hour.
  public let BATCH_MINTS_PER_HOUR : Nat = 128;
  public let HOUR_NS : Int = 3_600_000_000_000;

  public func isGrowerProvenanceToken(tokenId : Nat) : Bool {
    tokenId >= GROWER_TOKEN_START and tokenId < GROWER_TOKEN_END;
  };

  public func buildMetadataEntries(
    meta : CoopTypes.GrowerProvenanceMeta,
  ) : [(Text, ICRC7.Value)] {
    [
      ("name", #Text("IC SPICY Grower Provenance #" # Nat.toText(meta.plantId))),
      ("icspicy:kind", #Text("grower_provenance")),
      ("icspicy:grower", #Text(Principal.toText(meta.grower))),
      ("icspicy:grower_name", #Text(meta.growerName)),
      ("icspicy:plant_id", #Nat(meta.plantId)),
      ("icspicy:variety", #Text(meta.variety)),
      ("icspicy:minted_at", #Int(meta.mintedAt)),
    ];
  };

  public func checkMintRate(
    limits : Map.Map<Principal, (Nat, Int)>,
    caller : Principal,
  ) : Bool {
    let now = Time.now();
    switch (limits.get(caller)) {
      case null true;
      case (?(count, windowStart)) {
        if (now - windowStart >= HOUR_NS) true
        else count < MINTS_PER_HOUR;
      };
    };
  };

  public func recordMint(
    limits : Map.Map<Principal, (Nat, Int)>,
    caller : Principal,
  ) {
    recordMintCount(limits, caller, 1);
  };

  public func recordMintCount(
    limits : Map.Map<Principal, (Nat, Int)>,
    caller : Principal,
    count : Nat,
  ) {
    if (count == 0) return;
    let now = Time.now();
    switch (limits.get(caller)) {
      case null { limits.add(caller, (count, now)) };
      case (?(prev, windowStart)) {
        if (now - windowStart >= HOUR_NS) {
          limits.add(caller, (count, now));
        } else {
          limits.add(caller, (prev + count, windowStart));
        };
      };
    };
  };

  public func checkBatchMintAllowance(
    limits : Map.Map<Principal, (Nat, Int)>,
    caller : Principal,
    requested : Nat,
  ) : Bool {
    if (requested == 0) return true;
    if (requested > BATCH_MINTS_PER_HOUR) return false;
    let now = Time.now();
    switch (limits.get(caller)) {
      case null true;
      case (?(count, windowStart)) {
        if (now - windowStart >= HOUR_NS) true
        else count + requested <= BATCH_MINTS_PER_HOUR;
      };
    };
  };

  public func tokensRemainingInBatchWindow(
    limits : Map.Map<Principal, (Nat, Int)>,
    caller : Principal,
  ) : Nat {
    let now = Time.now();
    switch (limits.get(caller)) {
      case null BATCH_MINTS_PER_HOUR;
      case (?(count, windowStart)) {
        if (now - windowStart >= HOUR_NS) BATCH_MINTS_PER_HOUR
        else if (count >= BATCH_MINTS_PER_HOUR) 0
        else BATCH_MINTS_PER_HOUR - count;
      };
    };
  };

  public func plantOwner(
    plantOwners : Map.Map<Common.PlantId, Principal>,
    plantId : Common.PlantId,
  ) : ?Principal {
    plantOwners.get(plantId);
  };

  public func isGerminatedPlant(plant : PlantTypes.Plant) : Bool {
    switch (plant.stage) {
      case (#Seed) false;
      case (#Seedling) true;
      case (#Mature) true;
    };
  };

  public func mintGrowerToken(
    nextId : Nat,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    growerMeta : Map.Map<Nat, CoopTypes.GrowerProvenanceMeta>,
    grower : Principal,
    growerName : Text,
    plantId : Common.PlantId,
    variety : Text,
  ) : Result.Result<Nat, Text> {
    let tokenId = nextId;
    let growerAccount : ICRC7.Account = { owner = grower; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, null, growerAccount)) {
      case (#err(e)) return #err("Mint failed: " # e);
      case (#ok) {};
    };
    nftTokenPlantIds.add(tokenId, plantId);
    growerMeta.add(tokenId, {
      grower;
      growerName;
      plantId;
      variety;
      mintedAt = Time.now();
    });
    #ok(tokenId);
  };
};

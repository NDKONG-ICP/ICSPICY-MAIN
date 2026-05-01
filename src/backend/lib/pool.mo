import Map   "mo:core/Map";
import List  "mo:core/List";
import Array "mo:core/Array";
import Nat   "mo:core/Nat";
import Time  "mo:core/Time";
import Int   "mo:core/Int";
import Text  "mo:core/Text";
import PoolTypes "../types/pool";
import ClaimTypes "../types/claim";

module {
  public type PoolMap = Map.Map<Nat, PoolTypes.PoolNFTRecord>;

  // Total pool size and rarity boundaries (first 5000 = Common, next 2888 = Uncommon, last 1000 = Rare)
  let POOL_SIZE  : Nat = 8888;
  let COMMON_END : Nat = 5000;   // ids 0..4999
  let UNCOMMON_END : Nat = 7888; // ids 5000..7887
  // ids 7888..8887 = Rare

  // ── Rarity helpers ────────────────────────────────────────────────────────

  func rarityFor(id : Nat) : ClaimTypes.RarityTier {
    if (id < COMMON_END)   #Common
    else if (id < UNCOMMON_END) #Uncommon
    else #Rare;
  };

  // Simple deterministic pseudo-random number generator (LCG).
  // seed is updated in place via the returned next seed.
  func lcgNext(seed : Nat) : Nat {
    // LCG params: multiplier 6364136223846793005, increment 1442695040888963407, modulus 2^64
    // We stay in Nat (arbitrary precision) and truncate to 64-bit range.
    let m : Nat = 18446744073709551616; // 2^64
    (seed * 6364136223846793005 + 1442695040888963407) % m;
  };

  // Generate a layer-combination of `layerCount` entries where layer i picks
  // a random index in [0, layerFileCounts[i]).
  func genLayerCombo(layerCount : Nat, layerFileCounts : [Nat], seed : Nat) : ([Nat], Nat) {
    var s = seed;
    let combo = Array.tabulate(layerCount, func(i) {
      s := lcgNext(s);
      let count = if (i < layerFileCounts.size()) layerFileCounts[i] else 1;
      let safeCount = if (count == 0) 1 else count;
      s % safeCount;
    });
    (combo, s);
  };

  // ── Public helpers ─────────────────────────────────────────────────────────

  public func toPublic(r : PoolTypes.PoolNFTRecord) : PoolTypes.PoolNFTPublic {
    {
      id               = r.id;
      rarityTier       = r.rarityTier;
      layerCombination = r.layerCombination;
      compositeImageKey = r.compositeImageKey;
      status           = r.status;
      assignedTo       = r.assignedTo;
      assignedAt       = r.assignedAt;
      shopProductId    = r.shopProductId;
      claimTokenId     = r.claimTokenId;
    };
  };

  // ── Core generation ────────────────────────────────────────────────────────

  // Generate exactly 8888 PoolNFTRecords into `pool`.
  // Idempotent — clears existing records before generating.
  public func generateNFTPool(
    pool            : PoolMap,
    layerCount      : Nat,
    layerFileCounts : [Nat],
  ) {
    pool.clear();

    // Seed from wall-clock time
    var seed : Nat = Int.abs(Time.now());

    var i : Nat = 0;
    while (i < POOL_SIZE) {
      let tier = rarityFor(i);
      let (combo, nextSeed) = genLayerCombo(layerCount, layerFileCounts, seed);
      seed := nextSeed;

      let record : PoolTypes.PoolNFTRecord = {
        id               = i;
        rarityTier       = tier;
        layerCombination = combo;
        compositeImageKey = ""; // filled after compositing
        var status       = #Ready;
        var assignedTo   = null;
        var assignedAt   = null;
        var shopProductId = null;
        var claimTokenId  = null;
      };
      pool.add(i, record);
      i += 1;
    };
  };

  // ── Statistics ─────────────────────────────────────────────────────────────

  public func getPoolStats(pool : PoolMap) : PoolTypes.PoolStats {
    var ready : Nat = 0;
    var airdropped : Nat = 0;
    var shop : Nat = 0;
    var qrAssigned : Nat = 0;
    var common : Nat = 0;
    var uncommon : Nat = 0;
    var rare : Nat = 0;

    for ((_, r) in pool.entries()) {
      switch (r.status) {
        case (#Ready)      { ready      += 1 };
        case (#Airdropped) { airdropped += 1 };
        case (#Shop)       { shop       += 1 };
        case (#QRAssigned) { qrAssigned += 1 };
      };
      switch (r.rarityTier) {
        case (#Common)   { common   += 1 };
        case (#Uncommon) { uncommon += 1 };
        case (#Rare)     { rare     += 1 };
      };
    };

    {
      ready;
      airdropped;
      shop;
      qrAssigned;
      totalByRarity = { common; uncommon; rare };
    };
  };

  // ── Pagination ─────────────────────────────────────────────────────────────

  public func getPoolNFTs(
    pool   : PoolMap,
    filter : ?PoolTypes.PoolNFTStatus,
    offset : Nat,
    limit  : Nat,
  ) : [PoolTypes.PoolNFTPublic] {
    let all = List.empty<PoolTypes.PoolNFTPublic>();
    var skipped : Nat = 0;
    var collected : Nat = 0;

    label scan for ((_, r) in pool.entries()) {
      let matches = switch (filter) {
        case null     true;
        case (?status) {
          switch (r.status, status) {
            case (#Ready,      #Ready)      true;
            case (#Airdropped, #Airdropped) true;
            case (#Shop,       #Shop)       true;
            case (#QRAssigned, #QRAssigned) true;
            case (_,           _)           false;
          }
        };
      };
      if (not matches) continue scan;

      if (skipped < offset) { skipped += 1; continue scan };
      if (collected >= limit)               continue scan;

      all.add(toPublic(r));
      collected += 1;
    };

    all.toArray();
  };

  // ── Status mutations ───────────────────────────────────────────────────────

  public func markAirdropped(
    pool      : PoolMap,
    id        : Nat,
    recipient : Principal,
  ) : Bool {
    switch (pool.get(id)) {
      case null false;
      case (?r) {
        r.status     := #Airdropped;
        r.assignedTo := ?recipient;
        r.assignedAt := ?(Int.abs(Time.now()));
        true;
      };
    };
  };

  public func markShop(
    pool      : PoolMap,
    id        : Nat,
    productId : Nat,
  ) : Bool {
    switch (pool.get(id)) {
      case null false;
      case (?r) {
        r.status        := #Shop;
        r.shopProductId := ?productId;
        r.assignedAt    := ?(Int.abs(Time.now()));
        true;
      };
    };
  };

  public func markQRAssigned(
    pool         : PoolMap,
    id           : Nat,
    claimTokenId : Text,
  ) : Bool {
    switch (pool.get(id)) {
      case null false;
      case (?r) {
        r.status       := #QRAssigned;
        r.claimTokenId := ?claimTokenId;
        r.assignedAt   := ?(Int.abs(Time.now()));
        true;
      };
    };
  };

  public func resetPoolNFT(pool : PoolMap, id : Nat) : Bool {
    switch (pool.get(id)) {
      case null false;
      case (?r) {
        r.status        := #Ready;
        r.assignedTo    := null;
        r.assignedAt    := null;
        r.shopProductId := null;
        r.claimTokenId  := null;
        true;
      };
    };
  };
};

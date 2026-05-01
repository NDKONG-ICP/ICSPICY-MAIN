import Map       "mo:core/Map";
import List      "mo:core/List";
import Nat       "mo:core/Nat";
import Text      "mo:core/Text";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import PoolTypes  "../types/pool";
import PoolLib    "../lib/pool";

mixin (
  accessControlState : AccessControl.AccessControlState,
  nftPool            : PoolLib.PoolMap,
  nextPoolProductId  : { var value : Nat },
) {

  // ── Generation ─────────────────────────────────────────────────────────────

  /// Admin-only. Triggers pre-generation of all 8888 composite NFT records.
  /// layerCount     — how many artwork layers exist (e.g. 10)
  /// layerFileCounts — number of image files per layer (used for random combo)
  public shared ({ caller }) func preGenerateNFTPool(
    layerCount      : Nat,
    layerFileCounts : [Nat],
  ) : async { ok : Bool; total : Nat } {
    if (not AccessControl.isAdmin(accessControlState, caller)) return { ok = false; total = 0 };
    PoolLib.generateNFTPool(nftPool, layerCount, layerFileCounts);
    { ok = true; total = nftPool.size() };
  };

  // ── Dashboard stats ────────────────────────────────────────────────────────

  /// Returns Ready / Airdropped / Shop / QRAssigned counts plus rarity breakdown.
  public query func getPoolStats() : async PoolTypes.PoolStats {
    PoolLib.getPoolStats(nftPool);
  };

  // ── Paginated listing ──────────────────────────────────────────────────────

  /// Returns a page of pool NFTs, optionally filtered by status.
  public query func getPoolNFTs(
    filter : ?PoolTypes.PoolNFTStatus,
    offset : Nat,
    limit  : Nat,
  ) : async [PoolTypes.PoolNFTPublic] {
    PoolLib.getPoolNFTs(nftPool, filter, offset, limit);
  };

  // ── Batch actions (admin-gated) ────────────────────────────────────────────

  /// Airdrop a batch of pool NFTs to specific recipients.
  public shared ({ caller }) func batchAirdropFromPool(
    assignments : [PoolTypes.AirdropAssignment],
  ) : async { succeeded : Nat; failed : Nat } {
    if (not AccessControl.isAdmin(accessControlState, caller)) return { succeeded = 0; failed = assignments.size() };
    var ok : Nat = 0;
    var fail : Nat = 0;
    for (a in assignments.vals()) {
      if (PoolLib.markAirdropped(nftPool, a.nftId, a.recipient)) ok += 1
      else fail += 1;
    };
    { succeeded = ok; failed = fail };
  };

  /// List a batch of pool NFTs on the shop with individual prices.
  public shared ({ caller }) func batchListOnShop(
    assignments : [PoolTypes.ShopAssignment],
  ) : async { succeeded : Nat; failed : Nat } {
    if (not AccessControl.isAdmin(accessControlState, caller)) return { succeeded = 0; failed = assignments.size() };
    var ok : Nat = 0;
    var fail : Nat = 0;
    for (a in assignments.vals()) {
      // Allocate a product ID slot for each NFT
      let productId = nextPoolProductId.value;
      nextPoolProductId.value += 1;
      if (PoolLib.markShop(nftPool, a.nftId, productId)) ok += 1
      else fail += 1;
    };
    { succeeded = ok; failed = fail };
  };

  /// Assign a batch of pool NFTs to QR-code claim tokens.
  /// Returns generated claimTokenId for each NFT.
  public shared ({ caller }) func batchAssignToQR(
    nftIds : [Nat],
  ) : async [PoolTypes.QRAssignmentResult] {
    if (not AccessControl.isAdmin(accessControlState, caller)) return [];
    let results = List.empty<PoolTypes.QRAssignmentResult>();
    for (nftId in nftIds.vals()) {
      let claimTokenId = "pool-claim-" # nftId.toText();
      if (PoolLib.markQRAssigned(nftPool, nftId, claimTokenId)) {
        results.add({ nftId; claimTokenId });
      };
    };
    results.toArray();
  };

  /// Reset a single NFT in the orphan pool map back to #Ready status.
  /// NOTE: this operates on pool-api.mo's separate nftPool map.
  /// For the primary 8888 NFT pool, use resetPoolNFT on artwork-upload-api.mo.
  public shared ({ caller }) func resetOrphanPoolNFT(nftId : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) return false;
    PoolLib.resetPoolNFT(nftPool, nftId);
  };
};

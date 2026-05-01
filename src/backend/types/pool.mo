import Common "common";
import ClaimTypes "claim";

module {
  public type RarityTier = ClaimTypes.RarityTier;
  public type Timestamp   = Common.Timestamp;

  // Status of a single pre-generated pool NFT
  public type PoolNFTStatus = {
    #Ready;       // generated and waiting
    #Airdropped;  // sent directly to a user's principal
    #Shop;        // listed for sale in the shop
    #QRAssigned;  // bound to a QR-code claim token
  };

  // One pre-generated NFT record in the pool
  public type PoolNFTRecord = {
    id              : Nat;
    rarityTier      : RarityTier;
    layerCombination: [Nat];        // index per layer (length == layerCount)
    compositeImageKey : Text;       // asset canister key, set after compositing
    var status      : PoolNFTStatus;
    var assignedTo  : ?Principal;   // set when airdropped
    var assignedAt  : ?Timestamp;
    var shopProductId : ?Nat;       // set when listed on shop
    var claimTokenId  : ?Text;      // set when assigned to QR
  };

  // Immutable public view of a PoolNFTRecord (safe to return over the wire)
  public type PoolNFTPublic = {
    id              : Nat;
    rarityTier      : RarityTier;
    layerCombination: [Nat];
    compositeImageKey : Text;
    status          : PoolNFTStatus;
    assignedTo      : ?Principal;
    assignedAt      : ?Timestamp;
    shopProductId   : ?Nat;
    claimTokenId    : ?Text;
  };

  // Aggregate dashboard counters
  public type PoolStats = {
    ready       : Nat;
    airdropped  : Nat;
    shop        : Nat;
    qrAssigned  : Nat;
    totalByRarity : {
      common   : Nat;
      uncommon : Nat;
      rare     : Nat;
    };
  };

  // Input for a single airdrop assignment
  public type AirdropAssignment = {
    nftId     : Nat;
    recipient : Principal;
  };

  // Input for a single shop listing
  public type ShopAssignment = {
    nftId  : Nat;
    price  : Nat;
  };

  // Output of a QR assignment — returns the generated claimTokenId
  public type QRAssignmentResult = {
    nftId        : Nat;
    claimTokenId : Text;
  };
};

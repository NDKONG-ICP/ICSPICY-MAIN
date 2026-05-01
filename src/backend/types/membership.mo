import Common "common";
import PlantTypes "plants";
import ClaimTypes "claim";

module {
  public type MembershipTier = {
    #Standard;
    #Premium; // 10% discount, DAO access, no physical custody required
  };

  public type MembershipNFT = {
    id : Nat;
    owner : Principal;
    tier : MembershipTier;
    issued_at : Common.Timestamp;
    nft_standard : { #ICRC37; #Hedera; #EXT };
    var nft_id : ?Text;
    var is_founder : Bool;
    var rarity_tier : ?ClaimTypes.RarityTier;
    var layer_combination : [Nat];
  };

  public type MembershipNFTPublic = {
    id : Nat;
    owner : Principal;
    tier : MembershipTier;
    issued_at : Common.Timestamp;
    nft_standard : { #ICRC37; #Hedera; #EXT };
    nft_id : ?Text;
    is_founder : Bool;
    rarity_tier : ?ClaimTypes.RarityTier;
    layer_combination : [Nat];
  };

  // Input for batch-minting the Founders Collection (50 unique NFTs)
  public type FoundersMintInput = {
    recipient : Principal;
    rarityTier : ClaimTypes.RarityTier;
    badgeImageKey : Text;
    compositeImageKey : Text;
    layerCombination : [Nat];
    nft_standard : PlantTypes.NFTStandard;
  };

  // Result entry returned for each successfully minted Founders NFT
  public type FoundersMintResult = {
    recipient : Principal;
    tokenId : Text;
    standard : PlantTypes.NFTStandard;
  };
};

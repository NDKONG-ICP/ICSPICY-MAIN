import Common "common";
import ClaimTypes "claim";

module {
  // A single QR claim token that unlocks multiple plant NFTs at once (gift pack)
  public type BatchGiftPack = {
    id : Text;
    plant_ids : [Common.PlantId];
    claim_token_id : Common.ClaimTokenId; // the QR-scannable token printed on the label
    creator : Principal;
    created_at : Common.Timestamp;
    var redeemed : Bool;
    var redeemed_by : ?Principal;
  };

  // Immutable public view of a BatchGiftPack (safe to return over the wire)
  public type BatchGiftPackPublic = {
    id : Text;
    plant_ids : [Common.PlantId];
    claim_token_id : Common.ClaimTokenId;
    creator : Principal;
    created_at : Common.Timestamp;
    redeemed : Bool;
    redeemed_by : ?Principal;
    // Highest rarity tier (as discount pct: 10/12/15) across the batch
    highest_rarity_pct : Nat;
  };

  // A peer-to-peer resale listing — holder lists their plant NFT for sale to other users
  public type ResaleListing = {
    id : Text;
    plant_id : Common.PlantId;
    var seller : Principal;
    price_icp : Float; // denominated in ICP (e.g. 0.25)
    listed_at : Common.Timestamp;
    var is_active : Bool;
    rarity_tier : ClaimTypes.RarityTier; // transfers with the NFT to the new holder
  };

  // Immutable public view of a ResaleListing (safe to return over the wire)
  public type ResaleListingPublic = {
    id : Text;
    plant_id : Common.PlantId;
    seller : Principal;
    price_icp : Float;
    listed_at : Common.Timestamp;
    is_active : Bool;
    rarity_tier : ClaimTypes.RarityTier;
  };

  // Input for creating a resale listing
  public type CreateResaleListingInput = {
    plant_id : Common.PlantId;
    price_icp : Float;
    rarity_tier : ClaimTypes.RarityTier;
  };
};

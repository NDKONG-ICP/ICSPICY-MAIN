import Common "common";

module {
  // NFT QR claim token — maps spcy_<10hex> → ICRC-7 token ID with redemption flag.
  // Used by the Phase 4 QR claim flow (generateClaimToken / redeemClaim).
  // Separate from the legacy plant-based ClaimToken below.
  public type NftClaimEntry = {
    tokenId    : Nat;
    var redeemed : Bool;
  };

  // Rarity tier for RWA NFTs — determines holder discount percentage.
  //
  // Phase 3.0: #Founder added for the 50 Founder PepperHeads (token IDs
  // 7839-7888 per PROJECT_CONTEXT.md). The discount values in
  // rarityDiscountPct below (10/12/15%) DO NOT match the locked-in spec
  // (5/10/20/30%). Phase 4 rebalances the full table.
  public type RarityTier = {
    #Common;
    #Uncommon;
    #Rare;
    #Founder;
  };

  // One-time claimable token linked to a specific plant NFT (printed on QR label)
  public type ClaimToken = {
    id : Common.ClaimTokenId;
    plant_id : Common.PlantId;
    created_at : Common.Timestamp;
    var redeemed_by : ?Principal;
    var redeemed_at : ?Common.Timestamp;
    rarity_tier : RarityTier;
    claim_data : Text; // JSON payload for the NFT claim (metadata snapshot)
  };

  // Immutable public view of a ClaimToken (safe to return over the wire)
  public type ClaimTokenPublic = {
    id : Common.ClaimTokenId;
    plant_id : Common.PlantId;
    created_at : Common.Timestamp;
    redeemed_by : ?Principal;
    redeemed_at : ?Common.Timestamp;
    rarity_tier : RarityTier;
    claim_data : Text;
  };

  // KNF application schedule entry — one row in a schedule card
  public type ScheduleEntry = {
    stage : Text;
    input_name : Text;
    dilution : Text;
    frequency : Text;
    timing : Text;
    notes : Text;
  };

  // A user-saved application schedule combining multiple KNF inputs by growth stage
  public type SavedSchedule = {
    id : Common.ScheduleId;
    owner : Principal;
    stage : Text;
    inputs : [Text]; // KNF input names (e.g. ["OHN", "FPJ"])
    created_at : Common.Timestamp;
    share_token : Text; // short opaque token for public share link
  };

  // Lifecycle upgrade event recorded each time a plant NFT is burned and re-minted
  public type LifecycleUpgradeEvent = {
    plant_id : Common.PlantId;
    old_nft_id : ?Text;
    new_nft_id : Text;
    old_stage : Text;
    new_stage : Text;
    upgraded_at : Common.Timestamp;
  };

  // Rarity tier helper — returns the integer discount percentage for a tier.
  // TODO Phase 4: rebalance to spec (Common 5%, Uncommon 10%, Rare 20%,
  // Founder 30%) per PROJECT_CONTEXT.md "Discount tiers" section. Current
  // values are legacy and known-incorrect; #Founder is set to its spec
  // value here only because there is no legacy value to preserve.
  public func rarityDiscountPct(tier : RarityTier) : Nat {
    switch tier {
      case (#Common)   10;
      case (#Uncommon) 12;
      case (#Rare)     15;
      case (#Founder)  30;
    };
  };

  // Convert a Nat (10/12/15) to a RarityTier variant
  public func natToRarityTier(n : Nat) : RarityTier {
    if (n >= 15) #Rare
    else if (n >= 12) #Uncommon
    else #Common;
  };
};

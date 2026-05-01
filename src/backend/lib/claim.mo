import Common "../types/common";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";

module {
  // Convert mutable ClaimToken to immutable public type
  public func toPublic(token : ClaimTypes.ClaimToken) : ClaimTypes.ClaimTokenPublic {
    {
      id = token.id;
      plant_id = token.plant_id;
      created_at = token.created_at;
      redeemed_by = token.redeemed_by;
      redeemed_at = token.redeemed_at;
      rarity_tier = token.rarity_tier;
      claim_data = token.claim_data;
    };
  };

  // Generate a one-time claim token for a plant NFT (admin-initiated, linked to QR label)
  public func generateClaimToken(
    claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
    plant_id : Common.PlantId,
    rarity_tier : ClaimTypes.RarityTier,
    now : Common.Timestamp,
  ) : ClaimTypes.ClaimTokenPublic {
    // Verify plant exists
    let plant = switch (plants.get(plant_id)) {
      case (?p) p;
      case null { Runtime.trap("Plant not found") };
    };

    // Build a unique token id by hashing plant_id + now + claim count
    let count = claimTokens.size();
    let rawId = "claim-" # plant_id.toText() # "-" # now.toText() # "-" # count.toText();
    let token_id = rawId;

    // Snapshot claim_data from the plant's RWA metadata if available
    let claim_data : Text = switch (plant.nft_id) {
      case (?nft_id) {
        switch (rwaTokens.get(nft_id)) {
          case (?meta) {
            "{\"token_id\":\"" # meta.token_id # "\"," #
            "\"name\":\"" # meta.name # "\"," #
            "\"variety\":\"" # plant.variety # "\"," #
            "\"rarity_tier\":" # meta.rarity_tier.toText() # "}"
          };
          case null { "{\"variety\":\"" # plant.variety # "\"}" };
        }
      };
      case null { "{\"variety\":\"" # plant.variety # "\"}" };
    };

    let token : ClaimTypes.ClaimToken = {
      id = token_id;
      plant_id = plant_id;
      created_at = now;
      var redeemed_by = null;
      var redeemed_at = null;
      rarity_tier = rarity_tier;
      claim_data = claim_data;
    };
    claimTokens.add(token_id, token);
    toPublic(token);
  };

  // Redeem a claim token — caller claims the NFT; token becomes non-reusable
  public func redeemClaim(
    claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    _plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    memberships : Map.Map<Principal, PlantTypes.RWATokenMetadata>,
    token_id : Common.ClaimTokenId,
    caller : Principal,
    now : Common.Timestamp,
  ) : ClaimTypes.ClaimTokenPublic {
    let token = switch (claimTokens.get(token_id)) {
      case (?t) t;
      case null { Runtime.trap("Claim token not found") };
    };
    if (token.redeemed_by != null) {
      Runtime.trap("Claim token already redeemed");
    };

    // Mark as redeemed
    token.redeemed_by := ?caller;
    token.redeemed_at := ?now;

    // Issue a membership-style NFT for the caller if they don't already hold one
    // with a rarity tier >= this one
    let discountPct = ClaimTypes.rarityDiscountPct(token.rarity_tier);
    let currentBest = getBestRarityDiscount(claimTokens, caller);
    if (currentBest < discountPct) {
      // Upsert membership token reflecting rarity discount
      let membershipMeta : PlantTypes.RWATokenMetadata = {
        token_id = "membership-" # caller.toText();
        name = "IC SPICY Membership NFT";
        description = "Lifetime discount membership — rarity tier " # discountPct.toText() # "%";
        image_key = "";
        attributes = [
          ("discount_pct", discountPct.toText()),
          ("rarity_tier", ClaimTypes.rarityDiscountPct(token.rarity_tier).toText()),
          ("claim_token_id", token_id),
          ("plant_id", token.plant_id.toText()),
          ("redeemed_at", now.toText()),
        ];
        owner = ?caller;
        minted_at = now;
        rarity_tier = discountPct;
      };
      memberships.add(caller, membershipMeta);
    };

    toPublic(token);
  };

  // Fetch a claim token by id (for QR scan deep-link preview)
  public func getClaimToken(
    claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    token_id : Common.ClaimTokenId,
  ) : ?ClaimTypes.ClaimTokenPublic {
    switch (claimTokens.get(token_id)) {
      case (?token) { ?toPublic(token) };
      case null { null };
    };
  };

  // Return the highest-discount rarity tier among all claim tokens owned/redeemed by a principal
  public func getBestRarityDiscount(
    claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    owner : Principal,
  ) : Nat {
    claimTokens.values().foldLeft(
      0,
      func(best : Nat, token : ClaimTypes.ClaimToken) : Nat {
        switch (token.redeemed_by) {
          case (?p) {
            if (p == owner) {
              let pct = ClaimTypes.rarityDiscountPct(token.rarity_tier);
              if (pct > best) pct else best
            } else best
          };
          case null { best };
        }
      },
    );
  };
};

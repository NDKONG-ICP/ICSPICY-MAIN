import Common "../types/common";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";
import BatchTypes "../types/batch-gift-and-resale";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Array "mo:core/Array";

module {
  // Convert mutable BatchGiftPack to immutable public view
  public func batchToPublic(
    pack : BatchTypes.BatchGiftPack,
    rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  ) : BatchTypes.BatchGiftPackPublic {
    // Compute highest rarity discount pct across all plants in the batch
    let highest_rarity_pct = pack.plant_ids.foldLeft(
      10, // default to Common (10%)
      func(best : Nat, plant_id : Common.PlantId) : Nat {
        switch (plants.get(plant_id)) {
          case null { best };
          case (?plant) {
            switch (plant.nft_id) {
              case null { best };
              case (?nft_id) {
                switch (rwaTokens.get(nft_id)) {
                  case null { best };
                  case (?meta) {
                    if (meta.rarity_tier > best) meta.rarity_tier else best
                  };
                }
              };
            }
          };
        }
      },
    );
    {
      id = pack.id;
      plant_ids = pack.plant_ids;
      claim_token_id = pack.claim_token_id;
      creator = pack.creator;
      created_at = pack.created_at;
      redeemed = pack.redeemed;
      redeemed_by = pack.redeemed_by;
      highest_rarity_pct = highest_rarity_pct;
    };
  };

  // Convert mutable ResaleListing to immutable public view
  public func listingToPublic(listing : BatchTypes.ResaleListing) : BatchTypes.ResaleListingPublic {
    {
      id = listing.id;
      plant_id = listing.plant_id;
      seller = listing.seller;
      price_icp = listing.price_icp;
      listed_at = listing.listed_at;
      is_active = listing.is_active;
      rarity_tier = listing.rarity_tier;
    };
  };

  // Admin: create a BatchGiftPack — generates a shared claim token for all plant_ids
  public func createBatchGiftPack(
    batchGiftPacks : Map.Map<Text, BatchTypes.BatchGiftPack>,
    claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
    plant_ids : [Common.PlantId],
    creator : Principal,
    now : Common.Timestamp,
  ) : BatchTypes.BatchGiftPackPublic {
    if (plant_ids.size() == 0) {
      Runtime.trap("Batch gift pack must contain at least one plant");
    };

    // Validate each plant exists and has a rwa_token_id (nft_id)
    for (plant_id in plant_ids.values()) {
      let plant = switch (plants.get(plant_id)) {
        case (?p) p;
        case null { Runtime.trap("Plant not found: " # plant_id.toText()) };
      };
      switch (plant.nft_id) {
        case null { Runtime.trap("Plant " # plant_id.toText() # " has no RWA token minted") };
        case (?_) {};
      };
    };

    // Generate a unique batch pack id and claim token id
    let count = batchGiftPacks.size();
    let batch_id = "batch-" # creator.toText() # "-" # now.toText() # "-" # count.toText();
    let claim_token_id = "batch-claim-" # now.toText() # "-" # count.toText();

    // Snapshot claim_data from all plants in the batch
    let plants_json = plant_ids.foldLeft(
      "",
      func(acc : Text, plant_id : Common.PlantId) : Text {
        let sep = if (acc == "") "" else ",";
        acc # sep # plant_id.toText()
      },
    );
    let claim_data = "{\"type\":\"batch\",\"plant_ids\":[" # plants_json # "],\"batch_id\":\"" # batch_id # "\"}";

    // Create a placeholder ClaimToken for the batch (plant_id set to first plant for compatibility)
    let first_plant_id = plant_ids[0];
    // Determine the highest rarity tier across all plants for the claim token
    let highest_rarity : ClaimTypes.RarityTier = plant_ids.foldLeft(
      #Common,
      func(best : ClaimTypes.RarityTier, plant_id : Common.PlantId) : ClaimTypes.RarityTier {
        switch (plants.get(plant_id)) {
          case null { best };
          case (?plant) {
            switch (plant.nft_id) {
              case null { best };
              case (?nft_id) {
                switch (rwaTokens.get(nft_id)) {
                  case null { best };
                  case (?meta) {
                    let tier = ClaimTypes.natToRarityTier(meta.rarity_tier);
                    let tierPct = ClaimTypes.rarityDiscountPct(tier);
                    let bestPct = ClaimTypes.rarityDiscountPct(best);
                    if (tierPct > bestPct) tier else best
                  };
                }
              };
            }
          };
        }
      },
    );

    let claimToken : ClaimTypes.ClaimToken = {
      id = claim_token_id;
      plant_id = first_plant_id;
      created_at = now;
      var redeemed_by = null;
      var redeemed_at = null;
      rarity_tier = highest_rarity;
      claim_data = claim_data;
    };
    claimTokens.add(claim_token_id, claimToken);

    let pack : BatchTypes.BatchGiftPack = {
      id = batch_id;
      plant_ids = plant_ids;
      claim_token_id = claim_token_id;
      creator = creator;
      created_at = now;
      var redeemed = false;
      var redeemed_by = null;
    };
    batchGiftPacks.add(batch_id, pack);

    batchToPublic(pack, rwaTokens, plants);
  };

  // Public: redeem a BatchGiftPack claim token — caller receives all NFTs + highest rarity membership
  public func redeemBatchGiftPack(
    batchGiftPacks : Map.Map<Text, BatchTypes.BatchGiftPack>,
    claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
    claimMemberships : Map.Map<Principal, PlantTypes.RWATokenMetadata>,
    token_id : Common.ClaimTokenId,
    caller : Principal,
    now : Common.Timestamp,
  ) : BatchTypes.BatchGiftPackPublic {
    // Look up the claim token
    let claimToken = switch (claimTokens.get(token_id)) {
      case (?t) t;
      case null { Runtime.trap("Claim token not found") };
    };
    if (claimToken.redeemed_by != null) {
      Runtime.trap("Claim token already redeemed");
    };

    // Find the batch gift pack by its claim_token_id
    let pack = switch (
      batchGiftPacks.values().find(func(p : BatchTypes.BatchGiftPack) : Bool {
        p.claim_token_id == token_id
      })
    ) {
      case (?p) p;
      case null { Runtime.trap("Batch gift pack not found for token") };
    };

    if (pack.redeemed) {
      Runtime.trap("Batch gift pack already redeemed");
    };

    // Transfer ownership of each plant NFT to caller and compute highest rarity
    var highest_rarity_pct : Nat = 10;
    for (plant_id in pack.plant_ids.values()) {
      switch (plants.get(plant_id)) {
        case null {}; // skip missing plants gracefully
        case (?plant) {
          // Transfer plant ownership to caller
          plant.sold_to := ?caller;
          plant.sold := true;

          // Track highest rarity from rwa tokens
          switch (plant.nft_id) {
            case null {};
            case (?nft_id) {
              switch (rwaTokens.get(nft_id)) {
                case null {};
                case (?meta) {
                  // Update rwa token owner
                  let updatedMeta : PlantTypes.RWATokenMetadata = {
                    meta with owner = ?caller
                  };
                  rwaTokens.add(nft_id, updatedMeta);
                  if (meta.rarity_tier > highest_rarity_pct) {
                    highest_rarity_pct := meta.rarity_tier;
                  };
                };
              };
            };
          };
        };
      };
    };

    // Mark claim token as redeemed
    claimToken.redeemed_by := ?caller;
    claimToken.redeemed_at := ?now;

    // Update claimMemberships with the highest rarity tier found in the batch
    let currentBest = switch (claimMemberships.get(caller)) {
      case (?m) m.rarity_tier;
      case null 0;
    };
    if (highest_rarity_pct > currentBest) {
      let membershipMeta : PlantTypes.RWATokenMetadata = {
        token_id = "membership-" # caller.toText();
        name = "IC SPICY Membership NFT";
        description = "Lifetime discount membership — rarity tier " # highest_rarity_pct.toText() # "%";
        image_key = "";
        attributes = [
          ("discount_pct", highest_rarity_pct.toText()),
          ("rarity_tier", highest_rarity_pct.toText()),
          ("redeemed_at", now.toText()),
          ("batch_claim_token_id", token_id),
        ];
        owner = ?caller;
        minted_at = now;
        rarity_tier = highest_rarity_pct;
      };
      claimMemberships.add(caller, membershipMeta);
    };

    // Mark the batch as redeemed
    pack.redeemed := true;
    pack.redeemed_by := ?caller;

    batchToPublic(pack, rwaTokens, plants);
  };

  // Query: fetch a BatchGiftPack by claim_token_id (used by QR deep-link landing page)
  public func getBatchGiftPack(
    batchGiftPacks : Map.Map<Text, BatchTypes.BatchGiftPack>,
    rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    claim_token_id : Common.ClaimTokenId,
  ) : ?BatchTypes.BatchGiftPackPublic {
    switch (
      batchGiftPacks.values().find(func(p : BatchTypes.BatchGiftPack) : Bool {
        p.claim_token_id == claim_token_id
      })
    ) {
      case (?pack) { ?batchToPublic(pack, rwaTokens, plants) };
      case null { null };
    };
  };

  // Caller lists their plant NFT for peer-to-peer resale; caller must be plant owner
  public func listNFTForResale(
    resaleListings : Map.Map<Text, BatchTypes.ResaleListing>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    plant_id : Common.PlantId,
    price_icp : Float,
    caller : Principal,
    now : Common.Timestamp,
  ) : BatchTypes.ResaleListingPublic {
    // Validate plant exists and caller owns it
    let plant = switch (plants.get(plant_id)) {
      case (?p) p;
      case null { Runtime.trap("Plant not found") };
    };

    let isOwner = switch (plant.sold_to) {
      case (?owner) { owner == caller };
      case null { plant.created_by == caller };
    };
    if (not isOwner) {
      Runtime.trap("Unauthorized: you do not own this plant NFT");
    };

    // Ensure no active listing for this plant already exists
    let alreadyListed = resaleListings.values().any(func(l : BatchTypes.ResaleListing) : Bool {
      l.plant_id == plant_id and l.is_active
    });
    if (alreadyListed) {
      Runtime.trap("An active resale listing already exists for this plant");
    };

    // Determine rarity tier from claim token or rwa token
    let rarity_tier : ClaimTypes.RarityTier = switch (plant.nft_id) {
      case null { #Common };
      case (?_) {
        switch (claimTokens.values().find(func(t : ClaimTypes.ClaimToken) : Bool {
          t.plant_id == plant_id and t.redeemed_by != null
        })) {
          case (?token) { token.rarity_tier };
          case null { #Common };
        };
      };
    };

    // Create the listing
    let count = resaleListings.size();
    let listing_id = "resale-" # plant_id.toText() # "-" # now.toText() # "-" # count.toText();
    let listing : BatchTypes.ResaleListing = {
      id = listing_id;
      plant_id = plant_id;
      var seller = caller;
      price_icp = price_icp;
      listed_at = now;
      var is_active = true;
      rarity_tier = rarity_tier;
    };
    resaleListings.add(listing_id, listing);

    listingToPublic(listing);
  };

  // Caller cancels their own active resale listing
  public func cancelResaleListing(
    resaleListings : Map.Map<Text, BatchTypes.ResaleListing>,
    listing_id : Text,
    caller : Principal,
  ) : () {
    let listing = switch (resaleListings.get(listing_id)) {
      case (?l) l;
      case null { Runtime.trap("Listing not found") };
    };
    if (listing.seller != caller) {
      Runtime.trap("Unauthorized: you are not the seller of this listing");
    };
    listing.is_active := false;
  };

  // Buyer purchases a resale listing — plant NFT + rarity discount transfer to buyer
  public func buyResaleListing(
    resaleListings : Map.Map<Text, BatchTypes.ResaleListing>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    claimMemberships : Map.Map<Principal, PlantTypes.RWATokenMetadata>,
    _claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    listing_id : Text,
    buyer : Principal,
    now : Common.Timestamp,
  ) : () {
    let listing = switch (resaleListings.get(listing_id)) {
      case (?l) l;
      case null { Runtime.trap("Listing not found") };
    };

    if (not listing.is_active) {
      Runtime.trap("Listing is no longer active");
    };
    if (listing.seller == buyer) {
      Runtime.trap("Cannot buy your own listing");
    };

    let seller = listing.seller;

    // Transfer plant ownership to buyer
    let plant = switch (plants.get(listing.plant_id)) {
      case (?p) p;
      case null { Runtime.trap("Plant not found") };
    };
    plant.sold_to := ?buyer;
    plant.sold := true;

    // Transfer rwa token ownership to buyer
    switch (plant.nft_id) {
      case null {};
      case (?_) {
        // (ownership tracked via plant.sold_to; rwa metadata owner updated in claim flow)
      };
    };

    // Grant buyer the rarity discount (use highest if buyer already has one)
    let rarityPct = ClaimTypes.rarityDiscountPct(listing.rarity_tier);
    let buyerCurrentBest = switch (claimMemberships.get(buyer)) {
      case (?m) m.rarity_tier;
      case null 0;
    };
    if (rarityPct > buyerCurrentBest) {
      let membershipMeta : PlantTypes.RWATokenMetadata = {
        token_id = "membership-" # buyer.toText();
        name = "IC SPICY Membership NFT";
        description = "Lifetime discount membership — rarity tier " # rarityPct.toText() # "%";
        image_key = "";
        attributes = [
          ("discount_pct", rarityPct.toText()),
          ("rarity_tier", rarityPct.toText()),
          ("acquired_via", "resale"),
          ("resale_listing_id", listing_id),
          ("acquired_at", now.toText()),
        ];
        owner = ?buyer;
        minted_at = now;
        rarity_tier = rarityPct;
      };
      claimMemberships.add(buyer, membershipMeta);
    };

    // Check if seller still holds any other claimed/owned plant NFTs
    let sellerHasOtherNFTs = plants.values().any(func(p : PlantTypes.Plant) : Bool {
      switch (p.sold_to) {
        case (?owner) { owner == seller and p.id != listing.plant_id };
        case null { p.created_by == seller and p.id != listing.plant_id and p.nft_id != null };
      }
    });

    // Remove seller's discount only if they no longer hold any other plant NFTs
    if (not sellerHasOtherNFTs) {
      claimMemberships.remove(seller);
    };

    // Deactivate the listing
    listing.is_active := false;
  };

  // Query: all active resale listings
  public func getActiveResaleListings(
    resaleListings : Map.Map<Text, BatchTypes.ResaleListing>,
  ) : [BatchTypes.ResaleListingPublic] {
    resaleListings.values()
      .filter(func(l : BatchTypes.ResaleListing) : Bool { l.is_active })
      .map<BatchTypes.ResaleListing, BatchTypes.ResaleListingPublic>(listingToPublic)
      .toArray();
  };

  // Query: all resale listings created by the caller (active or inactive)
  public func getMyResaleListings(
    resaleListings : Map.Map<Text, BatchTypes.ResaleListing>,
    caller : Principal,
  ) : [BatchTypes.ResaleListingPublic] {
    resaleListings.values()
      .filter(func(l : BatchTypes.ResaleListing) : Bool { l.seller == caller })
      .map<BatchTypes.ResaleListing, BatchTypes.ResaleListingPublic>(listingToPublic)
      .toArray();
  };
};

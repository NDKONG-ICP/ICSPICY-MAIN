import Common "../types/common";
import Types "../types/membership";
import PlantTypes "../types/plants";
import ClaimTypes "../types/claim";
import NFTLib "nft";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";

module {
  public func issueMembershipNFT(
    memberships : Map.Map<Principal, Types.MembershipNFT>,
    nextId : Nat,
    owner : Principal,
    tier : Types.MembershipTier,
    nft_standard : { #ICRC37; #Hedera; #EXT },
  ) : Types.MembershipNFT {
    let membership : Types.MembershipNFT = {
      id = nextId;
      owner = owner;
      tier = tier;
      issued_at = Time.now();
      nft_standard = nft_standard;
      var nft_id = null;
      var is_founder = false;
      var rarity_tier = null;
      var layer_combination = [];
    };
    memberships.add(owner, membership);
    membership;
  };

  public func hasMembership(
    memberships : Map.Map<Principal, Types.MembershipNFT>,
    caller : Principal,
  ) : Bool {
    memberships.containsKey(caller);
  };

  public func getMembership(
    memberships : Map.Map<Principal, Types.MembershipNFT>,
    caller : Principal,
  ) : ?Types.MembershipNFTPublic {
    switch (memberships.get(caller)) {
      case (?m) { ?toPublic(m) };
      case null { null };
    };
  };

  public func applyMembershipDiscount(
    memberships : Map.Map<Principal, Types.MembershipNFT>,
    caller : Principal,
    price_cents : Nat,
  ) : Nat {
    switch (memberships.get(caller)) {
      case null { price_cents };
      case (?m) {
        let pct : Nat = switch (m.rarity_tier) {
          case (?tier) { ClaimTypes.rarityDiscountPct(tier) };
          case null { 10 }; // default Standard/Premium membership = 10%
        };
        // Apply discount: price - (price * pct / 100)
        price_cents - price_cents * pct / 100;
      };
    };
  };

  // Batch-mint the Founders Collection.
  // For each entry: mint an EXT or ICRC37 NFT token, store membership with Founders metadata.
  public func batchMintFounders(
    memberships : Map.Map<Principal, Types.MembershipNFT>,
    icrc37Tokens : Map.Map<Text, NFTLib.ICRC37Metadata>,
    extTokens : Map.Map<Text, NFTLib.EXTMetadata>,
    nextIdRef : { var value : Nat },
    entries : [Types.FoundersMintInput],
  ) : [Types.FoundersMintResult] {
    let results = List.empty<Types.FoundersMintResult>();
    let now = Time.now();

    for (entry in entries.vals()) {
      let discountPct = ClaimTypes.rarityDiscountPct(entry.rarityTier);
      let rarityText = switch (entry.rarityTier) {
        case (#Common)   "Common";
        case (#Uncommon) "Uncommon";
        case (#Rare)     "Rare";
      };

      // Build attributes including Founders badge and rarity info
      let layerText = debug_show(entry.layerCombination);
      let attrs : [(Text, Text)] = [
        ("isFounder", "true"),
        ("rarityTier", rarityText),
        ("discount", discountPct.toText() # "%"),
        ("badgeImageKey", entry.badgeImageKey),
        ("layerCombination", layerText),
        ("collection", "IC SPICY Founders Collection"),
      ];

      // Mint based on requested standard
      let tokenId : Text = switch (entry.nft_standard) {
        case (#EXT) {
          NFTLib.mintEXT(extTokens, nextIdRef.value, entry.compositeImageKey, attrs, now);
        };
        case (#ICRC37) {
          // Build a synthetic PlantPublic-like token ID directly
          let tid = "icspicy-founders-" # nextIdRef.value.toText();
          let meta : NFTLib.ICRC37Metadata = {
            token_id = tid;
            plant_id = nextIdRef.value;
            variety = "Founders NFT #" # nextIdRef.value.toText();
            stage = #Mature;
            image_key = ?entry.compositeImageKey;
            attributes = attrs;
            minted_at = now;
          };
          icrc37Tokens.add(tid, meta);
          tid;
        };
        case (#Hedera) {
          // Hedera Founders NFTs use the same token ID pattern; actual Hedera mint is async/off-chain
          "icspicy-founders-hedera-" # nextIdRef.value.toText();
        };
      };

      // Upsert membership record with Founders metadata
      let membership : Types.MembershipNFT = {
        id = nextIdRef.value;
        owner = entry.recipient;
        tier = #Premium;
        issued_at = now;
        nft_standard = entry.nft_standard;
        var nft_id = ?tokenId;
        var is_founder = true;
        var rarity_tier = ?entry.rarityTier;
        var layer_combination = entry.layerCombination;
      };
      memberships.add(entry.recipient, membership);
      nextIdRef.value += 1;

      results.add({
        recipient = entry.recipient;
        tokenId = tokenId;
        standard = entry.nft_standard;
      });
    };

    results.toArray();
  };

  public func toPublic(m : Types.MembershipNFT) : Types.MembershipNFTPublic {
    {
      id = m.id;
      owner = m.owner;
      tier = m.tier;
      issued_at = m.issued_at;
      nft_standard = m.nft_standard;
      nft_id = m.nft_id;
      is_founder = m.is_founder;
      rarity_tier = m.rarity_tier;
      layer_combination = m.layer_combination;
    };
  };
};

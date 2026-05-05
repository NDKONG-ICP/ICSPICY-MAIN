import Types "../types/membership";
import ClaimTypes "../types/claim";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

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

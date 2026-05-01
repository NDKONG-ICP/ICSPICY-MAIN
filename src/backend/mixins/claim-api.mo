import Map "mo:core/Map";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";
import ClaimLib "../lib/claim";

mixin (
  accessControlState : AccessControl.AccessControlState,
  claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
  memberships : Map.Map<Principal, PlantTypes.RWATokenMetadata>,
) {
  // Admin: generate a QR-scannable claim token for a plant NFT (printed on tray label)
  public shared ({ caller }) func generateClaimToken(
    plant_id : Common.PlantId,
    rarity_tier : ClaimTypes.RarityTier,
  ) : async ClaimTypes.ClaimTokenPublic {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    ClaimLib.generateClaimToken(claimTokens, plants, rwaTokens, plant_id, rarity_tier, Time.now());
  };

  // Public (unauthenticated allowed for QR scan): redeem a claim token
  // Caller receives the NFT and a tiered discount membership entry
  public shared ({ caller }) func redeemClaim(
    token_id : Common.ClaimTokenId,
  ) : async ClaimTypes.ClaimTokenPublic {
    ClaimLib.redeemClaim(claimTokens, plants, memberships, token_id, caller, Time.now());
  };

  // Public query: fetch a claim token by id (used by QR deep-link landing page)
  public query func getClaimToken(
    token_id : Common.ClaimTokenId,
  ) : async ?ClaimTypes.ClaimTokenPublic {
    ClaimLib.getClaimToken(claimTokens, token_id);
  };
};

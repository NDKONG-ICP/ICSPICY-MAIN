import Map "mo:core/Map";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";
import BatchTypes "../types/batch-gift-and-resale";
import BatchLib "../lib/batch-gift-and-resale";

mixin (
  accessControlState : AccessControl.AccessControlState,
  batchGiftPacks : Map.Map<Text, BatchTypes.BatchGiftPack>,
  resaleListings : Map.Map<Text, BatchTypes.ResaleListing>,
  claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
  claimMemberships : Map.Map<Principal, PlantTypes.RWATokenMetadata>,
) {
  // Admin: create a batch gift pack — one QR unlocks all plant NFTs in the pack
  public shared ({ caller }) func createBatchGiftPack(
    plant_ids : [Common.PlantId],
  ) : async { #ok : BatchTypes.BatchGiftPackPublic; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    #ok(BatchLib.createBatchGiftPack(batchGiftPacks, claimTokens, plants, rwaTokens, plant_ids, caller, Time.now()));
  };

  // Public: redeem a claim token that may be either a single-plant or batch gift pack claim
  // If the token references a BatchGiftPack, all plants are minted to caller with highest rarity membership
  public shared ({ caller }) func redeemBatchClaim(
    token_id : Common.ClaimTokenId,
  ) : async { #ok : BatchTypes.BatchGiftPackPublic; #err : Text } {
    #ok(BatchLib.redeemBatchGiftPack(batchGiftPacks, claimTokens, plants, rwaTokens, claimMemberships, token_id, caller, Time.now()));
  };

  // Public query: fetch a batch gift pack by its claim token id (for QR deep-link landing page)
  public query func getBatchGiftPack(
    claim_token_id : Common.ClaimTokenId,
  ) : async ?BatchTypes.BatchGiftPackPublic {
    BatchLib.getBatchGiftPack(batchGiftPacks, rwaTokens, plants, claim_token_id);
  };

  // Authenticated: list caller's plant NFT for peer-to-peer resale
  // Caller must currently own the plant NFT
  public shared ({ caller }) func listNFTForResale(
    plant_id : Common.PlantId,
    price_icp : Float,
  ) : async { #ok : BatchTypes.ResaleListingPublic; #err : Text } {
    #ok(BatchLib.listNFTForResale(resaleListings, plants, claimTokens, plant_id, price_icp, caller, Time.now()));
  };

  // Authenticated: cancel an active resale listing (caller must be listing owner)
  public shared ({ caller }) func cancelResaleListing(
    listing_id : Text,
  ) : async { #ok; #err : Text } {
    BatchLib.cancelResaleListing(resaleListings, listing_id, caller);
    #ok;
  };

  // Authenticated: buy a resale listing — NFT + rarity discount transfer to buyer
  public shared ({ caller }) func buyResaleListing(
    listing_id : Text,
  ) : async { #ok; #err : Text } {
    BatchLib.buyResaleListing(resaleListings, plants, claimMemberships, claimTokens, listing_id, caller, Time.now());
    #ok;
  };

  // Public query: all currently active resale listings
  public query func getActiveResaleListings() : async [BatchTypes.ResaleListingPublic] {
    BatchLib.getActiveResaleListings(resaleListings);
  };

  // Authenticated query: caller's own resale listings (active + inactive)
  public shared query ({ caller }) func getMyResaleListings() : async [BatchTypes.ResaleListingPublic] {
    BatchLib.getMyResaleListings(resaleListings, caller);
  };
};

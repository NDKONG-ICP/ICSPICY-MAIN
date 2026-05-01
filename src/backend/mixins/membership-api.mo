import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import MembershipTypes "../types/membership";
import MembershipLib "../lib/membership";
import NFTLib "../lib/nft";

mixin (
  accessControlState : AccessControl.AccessControlState,
  memberships : Map.Map<Principal, MembershipTypes.MembershipNFT>,
  nextMembershipId : { var value : Nat },
  icrc37Tokens : Map.Map<Text, NFTLib.ICRC37Metadata>,
  extTokens : Map.Map<Text, NFTLib.EXTMetadata>,
) {
  // Admin: airdrop a membership NFT to any address
  public shared ({ caller }) func issueMembership(
    owner : Principal,
    tier : MembershipTypes.MembershipTier,
    nft_standard : { #ICRC37; #Hedera; #EXT },
  ) : async MembershipTypes.MembershipNFTPublic {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let membership = MembershipLib.issueMembershipNFT(memberships, nextMembershipId.value, owner, tier, nft_standard);
    nextMembershipId.value += 1;
    MembershipLib.toPublic(membership);
  };

  // Authenticated: check if caller has a membership NFT
  public query ({ caller }) func hasMembership() : async Bool {
    MembershipLib.hasMembership(memberships, caller);
  };

  // Authenticated: get caller's membership NFT details
  public query ({ caller }) func getCallerMembership() : async ?MembershipTypes.MembershipNFTPublic {
    MembershipLib.getMembership(memberships, caller);
  };

  // Admin: batch-mint the Founders Collection (up to 50 unique NFTs).
  // Each entry specifies recipient, rarity tier, badge/composite image keys, layer combo, and NFT standard.
  // Returns an array of {recipient, tokenId, standard} results — one per minted NFT.
  public shared ({ caller }) func batchMintFoundersCollection(
    entries : [MembershipTypes.FoundersMintInput],
  ) : async [MembershipTypes.FoundersMintResult] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    MembershipLib.batchMintFounders(memberships, icrc37Tokens, extTokens, nextMembershipId, entries);
  };
};

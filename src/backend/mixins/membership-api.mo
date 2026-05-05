import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import MembershipTypes "../types/membership";
import MembershipLib "../lib/membership";

mixin (
  accessControlState : AccessControl.AccessControlState,
  memberships : Map.Map<Principal, MembershipTypes.MembershipNFT>,
  nextMembershipId : { var value : Nat },
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

  // ── Deprecated stub (Phase 4 removal) ──────────────────────────────────────
  //
  // batchMintFoundersCollection minted the 50 Founder NFTs through a per-entry
  // admin card-builder UI. Phase 3 unifies Founder tokens (IDs 7839-7888) into
  // the 8888-token ICRC-7 pool, populated atomically via initializeNFTPool
  // (Phase 3.5). The legacy Founders card-builder UI in Admin.tsx is scheduled
  // for removal in Phase 4. See PROJECT_CONTEXT.md "Pre-existing technical
  // debt" item B8 for the migration plan.

  public shared func batchMintFoundersCollection(
    _entries : [MembershipTypes.FoundersMintInput],
  ) : async [MembershipTypes.FoundersMintResult] {
    Runtime.trap(
      "batchMintFoundersCollection is deprecated as of Phase 3.0. " #
      "The Founders tier (token IDs 7839-7888) is now part of the unified 8888 ICRC-7 pool, populated atomically via initializeNFTPool (admin-only, Phase 3.5). " #
      "To mint the Founders tier, call initializeNFTPool — it mints the entire 8888 collection including the 50 Founder PepperHeads in one operation. " #
      "Legacy Founders card-builder admin UI in Admin.tsx will be removed in Phase 4."
    );
  };
};

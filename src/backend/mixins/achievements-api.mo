// mixins/achievements-api.mo — Admin mint + profile queries for soulbound badges.
//
// Unlink-after-earn (intended): badges stay soulbound to the mint principal;
// unlinking separates identities and union queries no longer merge them.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Set "mo:core/Set";
import Text "mo:core/Text";
import AccessControl "../lib/access-control";
import AchievementsLib "../lib/achievements";
import LinkedIdentity "../lib/linked-identity";
import AchievementTypes "../types/achievements";
import ICRC7 "../types/icrc7";

mixin (
  accessControlState : AccessControl.AccessControlState,
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  badgeRegistry : Map.Map<Nat, AchievementTypes.BadgeRecord>,
  badgeByOwnerType : Map.Map<Text, Nat>,
  nextAchievementTokenId : { var value : Nat },
  linkedWallets : Map.Map<Principal, [Principal]>,
  walletToIdentity : Map.Map<Principal, Principal>,
) {
  /// Admin-only masterclass / verified badge mint. Resolves `recipient` to the
  /// canonical principal (II if linked OISY) before minting. Idempotent across
  /// all principals in principalsForUser for the same badgeType.
  public shared ({ caller }) func mintAchievementBadge(
    recipient : Principal,
    badgeType : Text,
    tier : Text,
    metadataJson : Text,
  ) : async Result.Result<Nat, Text> {
    AccessControl.requireAdmin(accessControlState, caller);
    AchievementsLib.mintBadge(
      nextAchievementTokenId,
      icrc7Owners,
      icrc7Balances,
      badgeRegistry,
      badgeByOwnerType,
      linkedWallets,
      walletToIdentity,
      recipient,
      badgeType,
      tier,
      metadataJson,
      #masterclass,
    );
  };

  /// Admin game badge mint — only `slicer-*` types enabled (validated runs).
  /// Pepper-patch / crafter prefixes remain blocked until server validation exists.
  public shared ({ caller }) func mintGameSeasonalBadge(
    recipient : Principal,
    badgeType : Text,
    tier : Text,
    metadataJson : Text,
  ) : async Result.Result<Nat, Text> {
    AccessControl.requireAdmin(accessControlState, caller);
    // AchievementsLib.GAME_BADGE_MINT_ENABLED == false → #err with rationale.
    AchievementsLib.mintBadge(
      nextAchievementTokenId,
      icrc7Owners,
      icrc7Balances,
      badgeRegistry,
      badgeByOwnerType,
      linkedWallets,
      walletToIdentity,
      recipient,
      badgeType,
      tier,
      metadataJson,
      #game,
    );
  };

  public query ({ caller }) func getMyBadges() : async [AchievementTypes.BadgePublic] {
    if (Principal.isAnonymous(caller)) { return [] };
    let principals = LinkedIdentity.principalsForUser(
      caller,
      linkedWallets,
      walletToIdentity,
    );
    AchievementsLib.listBadgesForPrincipals(badgeRegistry, principals);
  };

  public query func getBadgesByPrincipal(
    p : Principal,
  ) : async [AchievementTypes.BadgePublic] {
    let principals = LinkedIdentity.principalsForUser(
      p,
      linkedWallets,
      walletToIdentity,
    );
    AchievementsLib.listBadgesForPrincipals(badgeRegistry, principals);
  };

  public query func getBadgeByTokenId(
    tokenId : Nat,
  ) : async ?AchievementTypes.BadgePublic {
    switch (badgeRegistry.get(tokenId)) {
      case null null;
      case (?rec) ?AchievementsLib.toPublic(tokenId, rec);
    };
  };
};

// lib/achievements.mo — Soulbound achievement badges (ICRC-7 token IDs ≥ 200_000).

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import ICRC7 "../types/icrc7";
import AchievementTypes "../types/achievements";
import ICRC7Lib "./icrc7";
import LinkedIdentity "./linked-identity";

module {
  public let ACHIEVEMENT_TOKEN_START : Nat = 200_000;

  /// Anti-cheat gate: only validated slicer milestones may mint via #game source.
  /// Pepper-patch / crafter have no server validation yet — their badge prefixes stay blocked.
  public func gameBadgeMintEnabled(badgeType : Text) : Bool {
    Text.startsWith(badgeType, #text "slicer-");
  };

  /// @deprecated Use gameBadgeMintEnabled — kept for grep/docs only.
  public let GAME_BADGE_MINT_ENABLED : Bool = false;

  public let BADGE_IMAGE_BASE : Text =
    "https://gawk3-2qaaa-aaaao-ba4sa-cai.icp0.io/badges/";

  public let FALLBACK_BADGE_IMAGE : Text =
    "https://gawk3-2qaaa-aaaao-ba4sa-cai.icp0.io/badges/genesis.webp";

  /// @deprecated Use badgeImageUrl — kept for grep/docs only.
  public let PLACEHOLDER_IMAGE : Text = FALLBACK_BADGE_IMAGE;

  public func badgeImageUrl(badgeType : Text) : Text {
    if (badgeType == "slicer-first-blood") {
      BADGE_IMAGE_BASE # "slicer-first-blood.webp";
    } else if (badgeType == "slicer-craft-batch") {
      BADGE_IMAGE_BASE # "slicer-craft-batch.webp";
    } else if (badgeType == "slicer-reserve-batch") {
      BADGE_IMAGE_BASE # "slicer-reserve-batch.webp";
    } else if (badgeType == "slicer-legendary-batch") {
      BADGE_IMAGE_BASE # "slicer-legendary-batch.webp";
    } else if (badgeType == "slicer-frenzy-master") {
      BADGE_IMAGE_BASE # "slicer-frenzy-master.webp";
    } else if (badgeType == "slicer-reaper-hunter") {
      BADGE_IMAGE_BASE # "slicer-reaper-hunter.webp";
    } else if (badgeType == "genesis") {
      BADGE_IMAGE_BASE # "genesis.webp";
    } else if (badgeType == "founder") {
      BADGE_IMAGE_BASE # "founder.webp";
    } else {
      FALLBACK_BADGE_IMAGE;
    };
  };

  public func isAchievementToken(tokenId : Nat) : Bool {
    tokenId >= ACHIEVEMENT_TOKEN_START;
  };

  public func ownerTypeKey(owner : Principal, badgeType : Text) : Text {
    Principal.toText(owner) # "#" # badgeType;
  };

  public func sourceToText(source : AchievementTypes.BadgeSource) : Text {
    switch (source) {
      case (#masterclass) "masterclass";
      case (#game) "game";
    };
  };

  public func toPublic(
    tokenId : Nat,
    rec : AchievementTypes.BadgeRecord,
  ) : AchievementTypes.BadgePublic {
    {
      tokenId;
      badgeType = rec.badgeType;
      tier = rec.tier;
      earnedAt = rec.earnedAt;
      owner = rec.owner;
      metadataJson = rec.metadataJson;
      source = rec.source;
    };
  };

  public func buildMetadataEntries(
    tokenId : Nat,
    rec : AchievementTypes.BadgeRecord,
  ) : [(Text, ICRC7.Value)] {
    [
      ("name", #Text("IC SPICY Badge: " # rec.badgeType)),
      ("description", #Text("Soulbound achievement badge (" # sourceToText(rec.source) # ")")),
      ("image", #Text(badgeImageUrl(rec.badgeType))),
      ("icspicy:kind", #Text("achievement_badge")),
      ("icspicy:badge_type", #Text(rec.badgeType)),
      ("icspicy:tier", #Text(rec.tier)),
      ("icspicy:source", #Text(sourceToText(rec.source))),
      ("icspicy:earned_at", #Int(rec.earnedAt)),
      ("icspicy:token_id", #Nat(tokenId)),
      ("icspicy:soulbound", #Text("true")),
    ];
  };

  /// Find an existing badge of `badgeType` owned by ANY principal in the set.
  /// Definitive for the linking-after-earning case (earned under OISY, then linked II).
  public func findExistingBadgeToken(
    badgeByOwnerType : Map.Map<Text, Nat>,
    principals : [Principal],
    badgeType : Text,
  ) : ?Nat {
    for (p in principals.vals()) {
      switch (badgeByOwnerType.get(ownerTypeKey(p, badgeType))) {
        case (?tokenId) { return ?tokenId };
        case null {};
      };
    };
    null;
  };

  public func listBadgesForPrincipals(
    badgeRegistry : Map.Map<Nat, AchievementTypes.BadgeRecord>,
    principals : [Principal],
  ) : [AchievementTypes.BadgePublic] {
    var out : [AchievementTypes.BadgePublic] = [];
    for ((tokenId, rec) in badgeRegistry.entries()) {
      let owned = Array.find<Principal>(
        principals,
        func(p) { Principal.equal(p, rec.owner) },
      );
      switch (owned) {
        case (?_) { out := out.concat([toPublic(tokenId, rec)]) };
        case null {};
      };
    };
    out;
  };

  public func mintBadge(
    nextAchievementTokenId : { var value : Nat },
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    badgeRegistry : Map.Map<Nat, AchievementTypes.BadgeRecord>,
    badgeByOwnerType : Map.Map<Text, Nat>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    walletToIdentity : Map.Map<Principal, Principal>,
    recipient : Principal,
    badgeType : Text,
    tier : Text,
    metadataJson : Text,
    source : AchievementTypes.BadgeSource,
  ) : Result.Result<Nat, Text> {
    if (Text.size(badgeType) == 0) {
      return #err("badgeType required");
    };
    if (source == #game and not gameBadgeMintEnabled(badgeType)) {
      return #err(
        "Game badge minting disabled for this badge type: requires validated game session",
      );
    };

    // Idempotency: scan ALL linked principals (not just canonical) so a badge
    // earned under OISY before linking II cannot be minted again after link.
    let principals = LinkedIdentity.principalsForUser(
      recipient,
      linkedWallets,
      walletToIdentity,
    );
    switch (findExistingBadgeToken(badgeByOwnerType, principals, badgeType)) {
      case (?existing) { return #ok(existing) };
      case null {};
    };

    // Mint to canonical (II if recipient is a linked OISY wallet).
    let owner = LinkedIdentity.canonicalPrincipal(recipient, walletToIdentity);
    let tokenId = nextAchievementTokenId.value;
    if (tokenId < ACHIEVEMENT_TOKEN_START) {
      return #err("achievement token counter below reserved range");
    };
    let ownerAccount : ICRC7.Account = { owner; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, null, ownerAccount)) {
      case (#err(e)) { return #err("Mint failed: " # e) };
      case (#ok) {};
    };

    let rec : AchievementTypes.BadgeRecord = {
      badgeType;
      tier;
      earnedAt = Time.now();
      owner;
      metadataJson;
      source;
    };
    badgeRegistry.add(tokenId, rec);
    badgeByOwnerType.add(ownerTypeKey(owner, badgeType), tokenId);
    nextAchievementTokenId.value += 1;
    #ok(tokenId);
  };
};

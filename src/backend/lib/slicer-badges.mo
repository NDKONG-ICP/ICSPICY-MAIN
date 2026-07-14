// lib/slicer-badges.mo — validated slicer milestone badge minting (Phase 3).

import Array "mo:core/Array";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AchievementsLib "./achievements";
import LinkedIdentity "./linked-identity";
import SlicerLog "./slicer-log";
import SlicerScore "./slicer-score";
import AchievementTypes "../types/achievements";
import ICRC7 "../types/icrc7";
import RunTypes "../types/slicer-run";

module {
  // Locked permanent idempotency keys — do not rename after first mint.
  public let BADGE_FIRST_BLOOD : Text = "slicer-first-blood";
  public let BADGE_CRAFT_BATCH : Text = "slicer-craft-batch";
  public let BADGE_RESERVE_BATCH : Text = "slicer-reserve-batch";
  public let BADGE_LEGENDARY_BATCH : Text = "slicer-legendary-batch";
  public let BADGE_FRENZY_MASTER : Text = "slicer-frenzy-master";
  public let BADGE_REAPER_HUNTER : Text = "slicer-reaper-hunter";

  type Milestone = {
    badgeType : Text;
    tier : Text;
    milestone : Text;
    threshold : Nat;
    qualifies : SlicerScore.ComputeOk -> Bool;
  };

  let MILESTONES : [Milestone] = [
    {
      badgeType = BADGE_FIRST_BLOOD;
      tier = "bronze";
      milestone = "first-blood";
      threshold = 10_000;
      qualifies = func(c) { c.score >= 10_000 };
    },
    {
      badgeType = BADGE_CRAFT_BATCH;
      tier = "silver";
      milestone = "craft-batch";
      threshold = 50_000;
      qualifies = func(c) { c.score >= 50_000 };
    },
    {
      badgeType = BADGE_RESERVE_BATCH;
      tier = "gold";
      milestone = "reserve-batch";
      threshold = 100_000;
      qualifies = func(c) { c.score >= 100_000 };
    },
    {
      badgeType = BADGE_LEGENDARY_BATCH;
      tier = "platinum";
      milestone = "legendary-batch";
      threshold = 250_000;
      qualifies = func(c) { c.score >= 250_000 };
    },
    {
      badgeType = BADGE_FRENZY_MASTER;
      tier = "gold";
      milestone = "frenzy-master";
      threshold = 20;
      qualifies = func(c) { c.bestCombo >= 20 };
    },
    {
      badgeType = BADGE_REAPER_HUNTER;
      tier = "gold";
      milestone = "reaper-hunter";
      threshold = 10;
      qualifies = func(c) { c.rareChilisSliced >= 10 };
    },
  ];

  func buildMetadataJson(
    m : Milestone,
    computed : SlicerScore.ComputeOk,
    seed : Nat,
    sessionId : Text,
    sliceLogHash : Text,
    earnedAt : Int,
  ) : Text {
    "{\"game\":\"slicer\""
    # ",\"milestone\":\"" # m.milestone # "\""
    # ",\"threshold\":" # Nat.toText(m.threshold)
    # ",\"score\":" # Nat.toText(computed.score)
    # ",\"seed\":" # Nat.toText(seed)
    # ",\"sessionId\":\"" # sessionId # "\""
    # ",\"sliceLogHash\":\"" # sliceLogHash # "\""
    # ",\"earnedAt\":" # Int.toText(earnedAt)
    # "}";
  };

  public func maybeMintSlicerBadges(
    nextAchievementTokenId : { var value : Nat },
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    badgeRegistry : Map.Map<Nat, AchievementTypes.BadgeRecord>,
    badgeByOwnerType : Map.Map<Text, Nat>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    walletToIdentity : Map.Map<Principal, Principal>,
    recipient : Principal,
    computed : SlicerScore.ComputeOk,
    seed : Nat,
    sessionId : Text,
    parsedRun : SlicerLog.ParsedRun,
    now : Int,
  ) : [RunTypes.BadgeEarned] {
    let sliceLogHash = SlicerLog.sliceLogHash(parsedRun);
    let principals = LinkedIdentity.principalsForUser(
      recipient,
      linkedWallets,
      walletToIdentity,
    );
    var earned : [RunTypes.BadgeEarned] = [];
    for (m in MILESTONES.vals()) {
      if (m.qualifies(computed)) {
        let had = switch (
          AchievementsLib.findExistingBadgeToken(badgeByOwnerType, principals, m.badgeType)
        ) {
          case (?_) { true };
          case null { false };
        };
        let meta = buildMetadataJson(m, computed, seed, sessionId, sliceLogHash, now);
        switch (
          AchievementsLib.mintBadge(
            nextAchievementTokenId,
            icrc7Owners,
            icrc7Balances,
            badgeRegistry,
            badgeByOwnerType,
            linkedWallets,
            walletToIdentity,
            recipient,
            m.badgeType,
            m.tier,
            meta,
            #game,
          )
        ) {
          case (#ok(tokenId)) {
            earned := Array.concat(earned, [{
              badgeType = m.badgeType;
              tokenId = tokenId;
              isNew = not had;
            }]);
          };
          case (#err _) {};
        };
      };
    };
    earned;
  };
};

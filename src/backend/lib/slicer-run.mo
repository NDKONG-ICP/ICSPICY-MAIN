// lib/slicer-run.mo — orchestrate validated slicer run submission.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AccessControl "../lib/access-control";
import GameSessionsLib "../lib/game-sessions";
import GamesLib "../lib/games";
import SlicerBadges "../lib/slicer-badges";
import SlicerLog "../lib/slicer-log";
import SlicerScore "../lib/slicer-score";
import SlicerTelemetry "../lib/slicer-telemetry";
import GameSessionsTypes "../types/game-sessions";
import GamesTypes "../types/games";
import AchievementTypes "../types/achievements";
import ICRC7 "../types/icrc7";
import RunTypes "../types/slicer-run";

module {
  func reject(
    counts : SlicerTelemetry.RejectCounts,
    sess : ?GameSessionsTypes.GameSession,
    reason : Text,
  ) : Result.Result<RunTypes.SubmitRunOk, Text> {
    SlicerTelemetry.recordRejection(counts, reason);
    switch (sess) {
      case (?s) { GameSessionsLib.consumeSession(s) };
      case null {};
    };
    #err(reason);
  };

  public func submitRun(
    sessions : Map.Map<Text, GameSessionsTypes.GameSession>,
    gameScores : Map.Map<Text, GamesTypes.GamePlayerStats>,
    gameLeaderboardCache : Map.Map<Text, [GamesTypes.LeaderboardEntry]>,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
    slicerRejectCounts : SlicerTelemetry.RejectCounts,
    nextAchievementTokenId : { var value : Nat },
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    badgeRegistry : Map.Map<Nat, AchievementTypes.BadgeRecord>,
    badgeByOwnerType : Map.Map<Text, Nat>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    walletToIdentity : Map.Map<Principal, Principal>,
    sessionId : Text,
    sliceLogJson : Text,
    caller : Principal,
    now : Int,
  ) : Result.Result<RunTypes.SubmitRunOk, Text> {
    switch (GameSessionsLib.getSessionForCaller(sessions, sessionId, caller, now)) {
      case (#err(e)) { reject(slicerRejectCounts, null, e) };
      case (#ok(sess)) {
        if (not Text.equal(sess.gameId, "slicer")) {
          return reject(slicerRejectCounts, ?sess, "Session is not a slicer session");
        };
        switch (SlicerScore.parseRunJson(sliceLogJson)) {
          case (#err(e)) {
            reject(slicerRejectCounts, ?sess, e);
          };
          case (#ok(run)) {
            switch (SlicerScore.validateRun(sess.seed, run)) {
              case (#err(e)) {
                reject(slicerRejectCounts, ?sess, e);
              };
              case (#ok(computed)) {
                GameSessionsLib.consumeSession(sess);
                let displayData =
                  "{\"bestCombo\":" # Nat.toText(computed.bestCombo)
                  # ",\"tier\":\"" # computed.tier # "\""
                  # ",\"rareChilis\":" # Nat.toText(computed.rareChilisSliced) # "}";
                switch (
                  GamesLib.recordScore(
                    gameScores,
                    gameLeaderboardCache,
                    leaderboardExcluded,
                    accessControlState,
                    "slicer",
                    caller,
                    computed.score,
                    displayData,
                    now,
                  )
                ) {
                  case (#err(e)) {
                    SlicerTelemetry.recordRejection(slicerRejectCounts, e);
                    #err(e);
                  };
                  case (#ok(sub)) {
                    let parsedRun : SlicerLog.ParsedRun = {
                      durationMs = run.durationMs;
                      livesLost = run.livesLost;
                      slices = run.slices;
                    };
                    let badgesEarned = SlicerBadges.maybeMintSlicerBadges(
                      nextAchievementTokenId,
                      icrc7Owners,
                      icrc7Balances,
                      badgeRegistry,
                      badgeByOwnerType,
                      linkedWallets,
                      walletToIdentity,
                      caller,
                      computed,
                      sess.seed,
                      sessionId,
                      parsedRun,
                      now,
                    );
                    #ok({
                      score = computed.score;
                      bestCombo = computed.bestCombo;
                      tier = computed.tier;
                      rareChilisSliced = computed.rareChilisSliced;
                      isNewBest = sub.isNewBest;
                      bestScore = sub.bestScore;
                      badgesEarned = badgesEarned;
                    });
                  };
                };
              };
            };
          };
        };
      };
    };
  };
};

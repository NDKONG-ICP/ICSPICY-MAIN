// mixins/games-api.mo — ICSPICY Games leaderboard + session API.

import Map "mo:core/Map";
import Blob "mo:core/Blob";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AccessControl "../lib/access-control";
import AssetUpload "../lib/asset-upload";
import CommunityTypes "../types/community";
import GameSessionsLib "../lib/game-sessions";
import GamesLib "../lib/games";
import RateLimit "../lib/rate-limit";
import SlicerRunLib "../lib/slicer-run";
import SlicerShareHtml "../lib/slicer-share-html";
import SlicerSpawn "../lib/slicer-spawn";
import SlicerTelemetry "../lib/slicer-telemetry";
import AchievementTypes "../types/achievements";
import GameSessionsTypes "../types/game-sessions";
import GamesTypes "../types/games";
import ICRC7 "../types/icrc7";
import RunTypes "../types/slicer-run";
import SlicerSpawnTypes "../types/slicer-spawn";
import RateLimits "../lib/rate-limits";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
  gameScores : Map.Map<Text, GamesTypes.GamePlayerStats>,
  gameLeaderboardCache : Map.Map<Text, [GamesTypes.LeaderboardEntry]>,
  leaderboardExcluded : Map.Map<Principal, Bool>,
  gameSessions : Map.Map<Text, GameSessionsTypes.GameSession>,
  slicerRejectCounts : SlicerTelemetry.RejectCounts,
  nextGameSessionCounter : { var value : Nat },
  nextAchievementTokenId : { var value : Nat },
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  badgeRegistry : Map.Map<Nat, AchievementTypes.BadgeRecord>,
  badgeByOwnerType : Map.Map<Text, Nat>,
  linkedWallets : Map.Map<Principal, [Principal]>,
  walletToIdentity : Map.Map<Principal, Principal>,
  frontendCanisterPrincipal : () -> Principal,
  uploadsCanisterPrincipal : () -> ?Principal,
) {
  /// Start a ranked game session — server issues unpredictable seed via IC raw_rand.
  /// Guests play without a session (unranked).
  public shared ({ caller }) func startGameSession(
    gameId : Text,
  ) : async Result.Result<GameSessionsTypes.StartSessionOk, Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.gameSession,
      caller,
      "Rate limited. Try again in a minute.",
    );
    await GameSessionsLib.startSession(
      gameSessions,
      nextGameSessionCounter,
      gameId,
      caller,
      Time.now(),
    );
  };

  /// Validated slicer run — server recomputes score from slice log + session seed.
  public shared ({ caller }) func submitSlicerRun(
    sessionId : Text,
    sliceLogJson : Text,
  ) : async Result.Result<RunTypes.SubmitRunOk, Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.gameScore,
      caller,
      "Rate limited. Try again in a minute.",
    );
    SlicerRunLib.submitRun(
      gameSessions,
      gameScores,
      gameLeaderboardCache,
      leaderboardExcluded,
      accessControlState,
      slicerRejectCounts,
      nextAchievementTokenId,
      icrc7Owners,
      icrc7Balances,
      badgeRegistry,
      badgeByOwnerType,
      linkedWallets,
      walletToIdentity,
      sessionId,
      sliceLogJson,
      caller,
      Time.now(),
    );
  };

  /// Parity harness + dev verification — deterministic spawn sequence from seed.
  public query func getSpawnSequence(
    seed : Nat,
    count : Nat,
  ) : async [SlicerSpawnTypes.SpawnEvent] {
    SlicerSpawn.getSpawnSequence(seed, count);
  };

  /// Submit a score for pepper-patch / crafter. Slicer is validated-only (submitSlicerRun).
  public shared ({ caller }) func submitGameScore(
    gameId : Text,
    score : Nat,
    displayData : Text,
  ) : async Result.Result<GamesTypes.SubmitScoreOk, Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.gameScore,
      caller,
      "Rate limited. Try again in a minute.",
    );
    GamesLib.submitScore(
      gameScores,
      gameLeaderboardCache,
      leaderboardExcluded,
      accessControlState,
      gameId,
      caller,
      score,
      displayData,
      Time.now(),
    );
  };

  public shared ({ caller }) func adminRemoveGameScore(
    gameId : Text,
    principal : Principal,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    GamesLib.removePlayerScore(
      gameScores,
      gameLeaderboardCache,
      leaderboardExcluded,
      accessControlState,
      gameId,
      principal,
    );
  };

  public shared ({ caller }) func adminSetLeaderboardExcluded(
    principal : Principal,
    excluded : Bool,
  ) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    GamesLib.setLeaderboardExcluded(
      leaderboardExcluded,
      gameScores,
      gameLeaderboardCache,
      accessControlState,
      principal,
      excluded,
    );
  };

  public query func getGameLeaderboard(
    gameId : Text,
    limit : Nat,
  ) : async [GamesTypes.LeaderboardEntry] {
    GamesLib.getLeaderboard(gameLeaderboardCache, gameId, limit);
  };

  public query ({ caller }) func getMyGameStats(
    gameId : Text,
  ) : async ?GamesTypes.GamePlayerStatsPublic {
    if (Principal.isAnonymous(caller)) return null;
    GamesLib.getMyStats(gameScores, gameId, caller);
  };

  /// Ops: inspect any principal's game stats (admin-only, no mutation).
  public query ({ caller }) func adminGetGameStats(
    gameId : Text,
    principal : Principal,
  ) : async ?GamesTypes.GamePlayerStatsPublic {
    AccessControl.requireAdmin(accessControlState, caller);
    GamesLib.getMyStats(gameScores, gameId, principal);
  };

  /// Caller rank + score even when outside the cached top-100 board.
  public query ({ caller }) func getMyGameRank(
    gameId : Text,
  ) : async ?GamesTypes.GameRankPublic {
    if (Principal.isAnonymous(caller)) return null;
    GamesLib.getMyRank(
      gameScores,
      leaderboardExcluded,
      accessControlState,
      gameId,
      caller,
    );
  };

  /// Aggregate slicer submit rejection counts by error type (no PII). For ops dashboards.
  public query func getSlicerSubmitRejectionStats() : async [(Text, Nat)] {
    SlicerTelemetry.toArray(slicerRejectCounts);
  };

  /// Public slicer share card data for /s/slicer/:principal (SPA + fallback).
  public query func getSlicerSharePublic(
    user : Principal,
  ) : async ?GamesTypes.SlicerSharePublic {
    switch (GamesLib.getMyStats(gameScores, "slicer", user)) {
      case null null;
      case (?stats) {
        if (stats.bestScore == 0) return null;
        let username = switch (profiles.get(user)) {
          case (?p) SlicerShareHtml.displayUsername(p.username, user);
          case null SlicerShareHtml.displayUsername("", user);
        };
        let tier = SlicerShareHtml.tierFromScore(stats.bestScore);
        let rank = switch (
          GamesLib.getMyRank(
            gameScores,
            leaderboardExcluded,
            accessControlState,
            "slicer",
            user,
          )
        ) {
          case null 0;
          case (?r) r.rank;
        };
        let rankedTotal = GamesLib.countRankedPlayers(
          gameScores,
          leaderboardExcluded,
          accessControlState,
          "slicer",
        );
        ?{
          principal = user;
          username = username;
          bestScore = stats.bestScore;
          lastPlayed = stats.lastPlayed;
          tierSlug = SlicerShareHtml.tierSlugText(tier);
          displayData = stats.displayData;
          rank = rank;
          rankedTotal = rankedTotal;
        };
      };
    };
  };

  /// Store per-player Slicer share OG plaque PNG on the uploads canister.
  /// Overwrites slicer-share-og/{principal}.png on each share.
  public shared ({ caller }) func storeSlicerShareOgImage(
    pngBytes : Blob,
  ) : async Result.Result<Text, Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.upload,
      caller,
      "Rate limited. Try again in a minute.",
    );
    let bytes = Blob.toArray(pngBytes);
    if (bytes.size() == 0) {
      return #err("Empty image");
    };
    if (bytes.size() > 2_000_000) {
      return #err("Image too large (max 2MB)");
    };
    let principalText = Principal.toText(caller);
    let path = SlicerShareHtml.shareOgAssetPath(principalText);
    await AssetUpload.storeToUploadsCanister(
      uploadsCanisterPrincipal(),
      path,
      bytes,
      "image/png",
    );
    let uploadsId = switch (uploadsCanisterPrincipal()) {
      case null return #err("Uploads canister not configured");
      case (?p) Principal.toText(p);
    };
    #ok(SlicerShareHtml.shareOgPublicUrl(uploadsId, principalText));
  };

  /// Publish dual-audience HTML (SPA shell + OG meta) to the frontend canister.
  /// Client builds html from current dist/index.html; backend validates + stores.
  public shared ({ caller }) func publishSlicerSharePage(
    html : Text,
  ) : async Result.Result<GamesTypes.PublishSlicerShareOk, Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.upload,
      caller,
      "Rate limited. Try again in a minute.",
    );
    switch (SlicerShareHtml.validatePublishHtml(html)) {
      case (?err) return #err(err);
      case null {};
    };
    switch (GamesLib.getMyStats(gameScores, "slicer", caller)) {
      case null return #err("Play a ranked Slicer run first");
      case (?stats) {
        if (stats.bestScore == 0) {
          return #err("No score to share yet");
        };
        let principalText = Principal.toText(caller);
        let lastPlayedNs = SlicerShareHtml.lastPlayedNs(stats.lastPlayed);
        let bytes = Blob.toArray(Text.encodeUtf8(html));
        let path = SlicerShareHtml.assetPath(principalText);
        await AssetUpload.storeToCanister(
          frontendCanisterPrincipal(),
          path,
          bytes,
          "text/html; charset=utf-8",
        );
        #ok({
          url = SlicerShareHtml.shareUrl(principalText, lastPlayedNs);
          score = stats.bestScore;
        });
      };
    };
  };

  /// Future hook: mint achievement NFTs or on-chain badges per game milestone.
  /// Intentionally inactive until achievement rules and NFT metadata are defined.
  public shared ({ caller }) func claimGameAchievement(
    gameId : Text,
    achievementId : Text,
  ) : async Result.Result<(), Text> {
    AccessControl.requireAuthenticated(caller);
    ignore caller;
    ignore gameId;
    ignore achievementId;
    #err("not_active");
  };
};

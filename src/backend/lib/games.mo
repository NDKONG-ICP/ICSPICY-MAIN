// lib/games.mo — ICSPICY Games score submission and leaderboard cache.

import Array "mo:core/Array";
import Int "mo:core/Int";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AccessControl "../lib/access-control";
import Sanitize "../lib/sanitize";
import Types "../types/games";

module {
  public let MAX_LEADERBOARD : Nat = 100;
  public let MAX_DISPLAY_CHARS : Nat = 1024;

  public let ALLOWED_GAME_IDS : [Text] = ["slicer", "pepper-patch", "crafter"];

  /// slicer: 2M SHU cap; other games: 5M SHU cap (server-side sanity only).
  public let SLICER_MAX_SCORE : Nat = 2_000_000;
  public let DEFAULT_MAX_SCORE : Nat = 5_000_000;

  public func scoreKey(gameId : Text, player : Principal) : Text {
    gameId # ":" # Principal.toText(player);
  };

  public func isAllowedGameId(gameId : Text) : Bool {
    for (id in ALLOWED_GAME_IDS.vals()) {
      if (Text.equal(gameId, id)) return true;
    };
    false;
  };

  public func maxScoreForGame(gameId : Text) : Nat {
    if (Text.equal(gameId, "slicer")) SLICER_MAX_SCORE else DEFAULT_MAX_SCORE;
  };

  public func toPublic(stats : Types.GamePlayerStats) : Types.GamePlayerStatsPublic {
    {
      bestScore = stats.bestScore;
      totalPlays = stats.totalPlays;
      lastPlayed = stats.lastPlayed;
      displayData = stats.displayData;
    };
  };

  /// Admins are excluded by default; explicit map entries override (true = hide, false = show).
  public func isLeaderboardExcluded(
    p : Principal,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
  ) : Bool {
    switch (leaderboardExcluded.get(p)) {
      case (?true) true;
      case (?false) false;
      case null AccessControl.isAdmin(accessControlState, p);
    };
  };

  func compareEntries(a : Types.LeaderboardEntry, b : Types.LeaderboardEntry) : {
    #less; #equal; #greater;
  } {
    if (a.score > b.score) #less
    else if (a.score < b.score) #greater
    else #equal;
  };

  public func rebuildLeaderboard(
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    gameId : Text,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
  ) : [Types.LeaderboardEntry] {
    let prefix = gameId # ":";
    let entries = List.empty<Types.LeaderboardEntry>();
    for ((key, stats) in gameScores.entries()) {
      if (Text.startsWith(key, #text prefix)) {
        switch (Text.stripStart(key, #text prefix)) {
          case null {};
          case (?pidText) {
            let p = Principal.fromText(pidText);
            if (not isLeaderboardExcluded(p, leaderboardExcluded, accessControlState)) {
              entries.add({
                principal = p;
                score = stats.bestScore;
                displayData = stats.displayData;
              });
            };
          };
        };
      };
    };
    let sorted = Array.sort<Types.LeaderboardEntry>(
      entries.toArray(),
      compareEntries,
    );
    if (sorted.size() <= MAX_LEADERBOARD) sorted
    else Array.tabulate<Types.LeaderboardEntry>(MAX_LEADERBOARD, func(i) { sorted[i] });
  };

  public func rebuildAllLeaderboardCaches(
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    gameLeaderboardCache : Map.Map<Text, [Types.LeaderboardEntry]>,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
  ) {
    for (gameId in ALLOWED_GAME_IDS.vals()) {
      gameLeaderboardCache.add(
        gameId,
        rebuildLeaderboard(gameScores, gameId, leaderboardExcluded, accessControlState),
      );
    };
  };

  public func removePlayerScore(
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    gameLeaderboardCache : Map.Map<Text, [Types.LeaderboardEntry]>,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
    gameId : Text,
    player : Principal,
  ) : Bool {
    if (not isAllowedGameId(gameId)) return false;
    let key = scoreKey(gameId, player);
    switch (gameScores.get(key)) {
      case null false;
      case (?_) {
        ignore gameScores.delete(key);
        gameLeaderboardCache.add(
          gameId,
          rebuildLeaderboard(gameScores, gameId, leaderboardExcluded, accessControlState),
        );
        true;
      };
    };
  };

  public func setLeaderboardExcluded(
    leaderboardExcluded : Map.Map<Principal, Bool>,
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    gameLeaderboardCache : Map.Map<Text, [Types.LeaderboardEntry]>,
    accessControlState : AccessControl.AccessControlState,
    principal : Principal,
    excluded : Bool,
  ) {
    leaderboardExcluded.add(principal, excluded);
    rebuildAllLeaderboardCaches(
      gameScores,
      gameLeaderboardCache,
      leaderboardExcluded,
      accessControlState,
    );
  };

  public func recordScore(
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    gameLeaderboardCache : Map.Map<Text, [Types.LeaderboardEntry]>,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
    gameId : Text,
    caller : Principal,
    score : Nat,
    displayDataRaw : Text,
    now : Int,
  ) : Result.Result<Types.SubmitScoreOk, Text> {
    if (not isAllowedGameId(gameId)) {
      return #err("Unknown gameId");
    };
    let cap = maxScoreForGame(gameId);
    if (score > cap) {
      return #err("Score exceeds server sanity cap");
    };
    let displayData = Sanitize.sanitizeText(displayDataRaw, MAX_DISPLAY_CHARS);
    let key = scoreKey(gameId, caller);
    var isNewBest = false;
    switch (gameScores.get(key)) {
      case (?existing) {
        existing.totalPlays += 1;
        existing.lastPlayed := now;
        if (score > existing.bestScore) {
          existing.bestScore := score;
          existing.displayData := displayData;
          isNewBest := true;
        };
        let result = {
          bestScore = existing.bestScore;
          totalPlays = existing.totalPlays;
          isNewBest;
        };
        gameLeaderboardCache.add(
          gameId,
          rebuildLeaderboard(gameScores, gameId, leaderboardExcluded, accessControlState),
        );
        #ok(result);
      };
      case null {
        let stats : Types.GamePlayerStats = {
          var bestScore = score;
          var totalPlays = 1;
          var lastPlayed = now;
          var displayData = displayData;
        };
        gameScores.add(key, stats);
        isNewBest := true;
        gameLeaderboardCache.add(
          gameId,
          rebuildLeaderboard(gameScores, gameId, leaderboardExcluded, accessControlState),
        );
        #ok({ bestScore = score; totalPlays = 1; isNewBest = true });
      };
    };
  };

  /// Client-submitted scores (pepper-patch, crafter). Slicer uses recordScore via submitSlicerRun.
  public func submitScore(
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    gameLeaderboardCache : Map.Map<Text, [Types.LeaderboardEntry]>,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
    gameId : Text,
    caller : Principal,
    score : Nat,
    displayDataRaw : Text,
    now : Int,
  ) : Result.Result<Types.SubmitScoreOk, Text> {
    if (Text.equal(gameId, "slicer")) {
      return #err("Slicer scores must be submitted via submitSlicerRun");
    };
    recordScore(
      gameScores,
      gameLeaderboardCache,
      leaderboardExcluded,
      accessControlState,
      gameId,
      caller,
      score,
      displayDataRaw,
      now,
    );
  };

  public func getLeaderboard(
    gameLeaderboardCache : Map.Map<Text, [Types.LeaderboardEntry]>,
    gameId : Text,
    limit : Nat,
  ) : [Types.LeaderboardEntry] {
    if (not isAllowedGameId(gameId)) return [];
    let take = if (limit > MAX_LEADERBOARD) MAX_LEADERBOARD else limit;
    switch (gameLeaderboardCache.get(gameId)) {
      case null [];
      case (?entries) {
        if (entries.size() <= take) entries
        else Array.tabulate<Types.LeaderboardEntry>(take, func(i) { entries[i] });
      };
    };
  };

  public func getMyStats(
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    gameId : Text,
    caller : Principal,
  ) : ?Types.GamePlayerStatsPublic {
    if (not isAllowedGameId(gameId)) return null;
    switch (gameScores.get(scoreKey(gameId, caller))) {
      case null null;
      case (?stats) ?toPublic(stats);
    };
  };

  /// Full-board rank for caller (1 = highest score). Works even when rank > MAX_LEADERBOARD.
  /// Excluded principals (admins, smoke-test wallets) receive null — not shown publicly.
  public func getMyRank(
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
    gameId : Text,
    caller : Principal,
  ) : ?Types.GameRankPublic {
    if (not isAllowedGameId(gameId)) return null;
    if (isLeaderboardExcluded(caller, leaderboardExcluded, accessControlState)) return null;
    switch (gameScores.get(scoreKey(gameId, caller))) {
      case null null;
      case (?mine) {
        let prefix = gameId # ":";
        var rank : Nat = 1;
        for ((key, stats) in gameScores.entries()) {
          if (Text.startsWith(key, #text prefix)) {
            switch (Text.stripStart(key, #text prefix)) {
              case null {};
              case (?pidText) {
                let p = Principal.fromText(pidText);
                if (
                  not isLeaderboardExcluded(p, leaderboardExcluded, accessControlState)
                  and stats.bestScore > mine.bestScore
                ) {
                  rank += 1;
                };
              };
            };
          };
        };
        ?{
          rank;
          score = mine.bestScore;
          displayData = mine.displayData;
        };
      };
    };
  };

  /// Count non-excluded principals with a positive best score for a game.
  public func countRankedPlayers(
    gameScores : Map.Map<Text, Types.GamePlayerStats>,
    leaderboardExcluded : Map.Map<Principal, Bool>,
    accessControlState : AccessControl.AccessControlState,
    gameId : Text,
  ) : Nat {
    if (not isAllowedGameId(gameId)) return 0;
    let prefix = gameId # ":";
    var count : Nat = 0;
    for ((key, stats) in gameScores.entries()) {
      if (Text.startsWith(key, #text prefix)) {
        switch (Text.stripStart(key, #text prefix)) {
          case null {};
          case (?pidText) {
            let p = Principal.fromText(pidText);
            if (
              not isLeaderboardExcluded(p, leaderboardExcluded, accessControlState)
              and stats.bestScore > 0
            ) {
              count += 1;
            };
          };
        };
      };
    };
    count;
  };
};

// types/games.mo — ICSPICY Games leaderboard types.

import Principal "mo:core/Principal";

module {
  public type GameId = Text;

  /// Per-player stats for one game. Stored in a composite-key side map.
  public type GamePlayerStats = {
    var bestScore : Nat;
    var totalPlays : Nat;
    var lastPlayed : Int;
    var displayData : Text;
  };

  public type GamePlayerStatsPublic = {
    bestScore : Nat;
    totalPlays : Nat;
    lastPlayed : Int;
    displayData : Text;
  };

  public type LeaderboardEntry = {
    principal : Principal;
    score : Nat;
    displayData : Text;
  };

  public type SubmitScoreOk = {
    bestScore : Nat;
    totalPlays : Nat;
    isNewBest : Bool;
  };

  /// Caller rank across all players for a game (not limited to cached top 100).
  public type GameRankPublic = {
    rank : Nat;
    score : Nat;
    displayData : Text;
  };

  public type SlicerSharePublic = {
    principal : Principal;
    username : Text;
    bestScore : Nat;
    lastPlayed : Int;
    tierSlug : Text;
    displayData : Text;
    rank : Nat;
    rankedTotal : Nat;
  };

  public type PublishSlicerShareOk = {
    url : Text;
    score : Nat;
  };
};

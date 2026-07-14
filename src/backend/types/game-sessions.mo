// types/game-sessions.mo — ranked game session records (Phase 1 substrate).

import Principal "mo:core/Principal";

module {
  public type GameSession = {
    player : Principal;
    gameId : Text;
    seed : Nat;
    startedAt : Int;
    var consumed : Bool;
  };

  public type StartSessionOk = {
    sessionId : Text;
    seed : Nat;
  };
};

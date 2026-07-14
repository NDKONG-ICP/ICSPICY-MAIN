// lib/game-sessions.mo — ranked game session lifecycle (Phase 2: IC raw_rand seeds).

import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Time "mo:core/Time";
import IC "ic:aaaaa-aa";
import GamesLib "../lib/games";
import Types "../types/game-sessions";

module {
  public let SESSION_TTL_NS : Int = 1_800_000_000_000; // 30 minutes

  /// Fold raw_rand blob bytes into a Nat seed (unpredictable to clients).
  /// Uses first 32 bytes when available; modular wrap avoids overflow.
  public func seedFromBlob(blob : Blob) : Nat {
    let bytes = Blob.toArray(blob);
    var h : Nat = 0;
    var i : Nat = 0;
    let limit = if (bytes.size() < 32) { bytes.size() } else { 32 };
    while (i < limit) {
      h := (h * 257 + Nat8.toNat(bytes[i])) % 2_147_483_647;
      i += 1;
    };
    if (h == 0 and bytes.size() > 0) {
      Nat8.toNat(bytes[0]) + 1;
    } else {
      h;
    };
  };

  public func makeSessionId(counter : Nat, now : Int) : Text {
    "gs-" # Nat.toText(counter) # "-" # Int.toText(now);
  };

  public func purgeExpired(
    sessions : Map.Map<Text, Types.GameSession>,
    now : Int,
  ) {
    let cutoff = now - SESSION_TTL_NS;
    for ((id, sess) in sessions.entries()) {
      if (sess.startedAt < cutoff) {
        ignore sessions.delete(id);
      };
    };
  };

  public func consumeSession(sess : Types.GameSession) {
    sess.consumed := true;
  };

  public func startSession(
    sessions : Map.Map<Text, Types.GameSession>,
    counter : { var value : Nat },
    gameId : Text,
    caller : Principal,
    now : Int,
  ) : async Result.Result<Types.StartSessionOk, Text> {
    if (not GamesLib.isAllowedGameId(gameId)) {
      return #err("Unknown gameId");
    };
    purgeExpired(sessions, now);
    let randBlob = await IC.raw_rand();
    let seed = seedFromBlob(randBlob);
    let idNum = counter.value;
    counter.value += 1;
    let sessionId = makeSessionId(idNum, now);
    sessions.add(
      sessionId,
      {
        player = caller;
        gameId = gameId;
        seed = seed;
        startedAt = now;
        var consumed = false;
      },
    );
    #ok({ sessionId = sessionId; seed = seed });
  };

  public func getSessionForCaller(
    sessions : Map.Map<Text, Types.GameSession>,
    sessionId : Text,
    caller : Principal,
    now : Int,
  ) : Result.Result<Types.GameSession, Text> {
    purgeExpired(sessions, now);
    switch (sessions.get(sessionId)) {
      case null { #err("Session not found") };
      case (?sess) {
        if (not Principal.equal(sess.player, caller)) {
          #err("Session does not belong to caller");
        } else if (sess.consumed) {
          #err("Session already consumed");
        } else if (sess.startedAt < now - SESSION_TTL_NS) {
          #err("Session expired");
        } else {
          #ok(sess);
        };
      };
    };
  };
};

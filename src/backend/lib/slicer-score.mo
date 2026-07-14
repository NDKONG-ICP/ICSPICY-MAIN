// lib/slicer-score.mo — integer-only slicer score recompute + slice-log validation.
// Spec: docs/slicer-determinism.md (Phase 2 scoring section).

import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Text "mo:core/Text";
import JsonMini "../lib/json-mini";
import ICRC7 "../types/icrc7";
import SlicerSpawn "../lib/slicer-spawn";
import SpawnTypes "../types/slicer-spawn";
import RunTypes "../types/slicer-run";

module {
  public let COMBO_WINDOW_MS : Nat = 900;
  /// Whole-object on-screen budget (engine lifeMs=8000) + 25% buffer for edge arcs.
  public let MAX_FLIGHT_MS : Nat = 10_000;
  /// After the last slice, the player may miss up to 3 objects (lives) before game-over.
  /// Staggered spawns at high level can exceed 3× single-flight budget — use 45s tail.
  public let MAX_END_TAIL_MS : Nat = 45_000;
  public let RARE_CHILI_KIND : Nat = 6;
  public let MAX_SEQUENCE_FOR_RUN : Nat = 4_000;

  // SHU base per kind Nat — mirrors constants.ts
  let SHU_BASE : [Nat] = [100, 150, 150, 200, 250, 500, 2_500];

  public func shuBase(kind : Nat) : Nat {
    if (kind >= SHU_BASE.size()) { 0 } else { SHU_BASE[kind] };
  };

  public func comboMultiplier(combo : Nat) : Nat {
    if (combo <= 1) { 1 }
    else if (combo == 2) { 2 }
    else if (combo == 3) { 3 }
    else if (combo == 4) { 5 }
    else if (combo == 5) { 7 }
    else { 10 };
  };

  public func scoreToTier(score : Nat) : Text {
    if (score >= 100_000) { "Legendary Small Batch" }
    else if (score >= 50_000) { "Reserve Batch" }
    else if (score >= 10_000) { "Craft Batch" }
    else { "Mild Batch" };
  };

  public type ParsedRun = {
    durationMs : Nat;
    livesLost : Nat;
    slices : [RunTypes.SliceLogEntry];
  };

  func mapGet(entries : [(Text, ICRC7.Value)], key : Text) : ?ICRC7.Value {
    for ((k, v) in entries.vals()) {
      if (Text.equal(k, key)) { return ?v };
    };
    null;
  };

  func parseSliceEntry(v : ICRC7.Value) : ?RunTypes.SliceLogEntry {
    switch (v) {
      case (#Map entries) {
        let idx = switch (mapGet(entries, "objectIndex")) {
          case (?#Nat n) ?n;
          case _ null;
        };
        let t = switch (mapGet(entries, "sliceTimeMs")) {
          case (?#Nat n) ?n;
          case _ null;
        };
        switch (idx, t) {
          case (?i, ?ms) ?{ objectIndex = i; sliceTimeMs = ms };
          case _ null;
        };
      };
      case _ null;
    };
  };

  public func parseRunJson(raw : Text) : Result.Result<ParsedRun, Text> {
    switch (JsonMini.parse(raw.encodeUtf8())) {
      case (#err e) { #err("Invalid sliceLogJson: " # e) };
      case (#ok(#Map root)) {
        let durationMs = switch (mapGet(root, "durationMs")) {
          case (?#Nat n) n;
          case _ { return #err("Missing durationMs") };
        };
        let livesLost = switch (mapGet(root, "livesLost")) {
          case (?#Nat n) n;
          case _ { return #err("Missing livesLost") };
        };
        switch (mapGet(root, "slices")) {
          case (?#Array items) {
            var out : [RunTypes.SliceLogEntry] = [];
            for (item in items.vals()) {
              switch (parseSliceEntry(item)) {
                case (?e) { out := out.concat([e]) };
                case null { return #err("Malformed slice entry") };
              };
            };
            #ok({ durationMs = durationMs; livesLost = livesLost; slices = out });
          };
          case _ { #err("Missing slices array") };
        };
      };
      case (#ok _) { #err("sliceLogJson must be a JSON object") };
    };
  };

  func sortSlices(slices : [RunTypes.SliceLogEntry]) : [RunTypes.SliceLogEntry] {
    Array.sort<RunTypes.SliceLogEntry>(
      slices,
      func(a : RunTypes.SliceLogEntry, b : RunTypes.SliceLogEntry) : {
        #less; #equal; #greater;
      } {
        if (a.sliceTimeMs < b.sliceTimeMs) { #less }
        else if (a.sliceTimeMs > b.sliceTimeMs) { #greater }
        else if (a.objectIndex < b.objectIndex) { #less }
        else if (a.objectIndex > b.objectIndex) { #greater }
        else { #equal };
      },
    );
  };

  func eventAtIndex(
    events : [SpawnTypes.SpawnEvent],
    idx : Nat,
  ) : ?SpawnTypes.SpawnEvent {
    for (ev in events.vals()) {
      if (ev.index == idx) { return ?ev };
    };
    null;
  };

  func theoreticalMaxForSlice(
    kind : Nat,
    isFrenzy : Bool,
  ) : Nat {
    let frenzy = if (isFrenzy) { 2 } else { 1 };
    shuBase(kind) * 10 * frenzy;
  };

  public type ComputeOk = {
    score : Nat;
    bestCombo : Nat;
    tier : Text;
    rareChilisSliced : Nat;
  };

  public func recomputeScore(
    events : [SpawnTypes.SpawnEvent],
    slices : [RunTypes.SliceLogEntry],
  ) : Result.Result<ComputeOk, Text> {
    if (slices.size() == 0) {
      return #err("Empty slice log");
    };
    let sorted = sortSlices(slices);
    var lastSliceMs : Nat = 0;
    var combo : Nat = 0;
    var bestCombo : Nat = 0;
    var score : Nat = 0;
    var rareChilisSliced : Nat = 0;
    var theoreticalMax : Nat = 0;

    for (entry in sorted.vals()) {
      switch (eventAtIndex(events, entry.objectIndex)) {
        case null { return #err("Unknown objectIndex") };
        case (?ev) {
          if (entry.sliceTimeMs < ev.spawnTimeMs) {
            return #err("sliceTimeMs before spawnTimeMs");
          };
          if (entry.sliceTimeMs > ev.spawnTimeMs + MAX_FLIGHT_MS) {
            return #err("sliceTimeMs outside flight window");
          };
          theoreticalMax += theoreticalMaxForSlice(ev.kind, ev.isFrenzy);
          if (entry.sliceTimeMs < lastSliceMs) {
            return #err("sliceTimeMs not monotonic");
          };
          if (entry.sliceTimeMs > lastSliceMs + COMBO_WINDOW_MS and lastSliceMs > 0) {
            combo := 0;
          };
          combo += 1;
          if (combo > bestCombo) { bestCombo := combo };
          let mult = comboMultiplier(combo);
          let frenzy = if (ev.isFrenzy) { 2 } else { 1 };
          score += shuBase(ev.kind) * mult * frenzy;
          if (ev.kind == RARE_CHILI_KIND) { rareChilisSliced += 1 };
          lastSliceMs := entry.sliceTimeMs;
        };
      };
    };

    if (score > theoreticalMax) {
      return #err("Score exceeds theoretical maximum for sliced objects");
    };

    #ok({
      score = score;
      bestCombo = bestCombo;
      tier = scoreToTier(score);
      rareChilisSliced = rareChilisSliced;
    });
  };

  public func validateRun(
    seed : Nat,
    run : ParsedRun,
  ) : Result.Result<ComputeOk, Text> {
    if (run.slices.size() == 0) {
      return #err("Empty slice log");
    };
    var maxIndex : Nat = 0;
    for (s in run.slices.vals()) {
      if (s.objectIndex > maxIndex) { maxIndex := s.objectIndex };
    };
    let seqCount = maxIndex + 1;
    let capped = if (seqCount > MAX_SEQUENCE_FOR_RUN) {
      MAX_SEQUENCE_FOR_RUN
    } else {
      seqCount
    };
    let events = SlicerSpawn.getSpawnSequence(seed, capped);

    // Duplicate objectIndex check
    var seen : [Nat] = [];
    for (s in run.slices.vals()) {
      for (x in seen.vals()) {
        if (x == s.objectIndex) { return #err("Duplicate objectIndex") };
      };
      seen := seen.concat([s.objectIndex]);
    };

    // Monotonic sliceTimeMs (pre-recompute quick fail)
    let sorted = sortSlices(run.slices);
    var prev : Nat = 0;
    var first = true;
    for (s in sorted.vals()) {
      if (not first and s.sliceTimeMs < prev) {
        return #err("sliceTimeMs not monotonic");
      };
      prev := s.sliceTimeMs;
      first := false;
    };

    let lastSlice = sorted[sorted.size() - 1].sliceTimeMs;
    if (run.durationMs < lastSlice) {
      return #err("durationMs shorter than last slice");
    };
    if (run.durationMs > lastSlice + MAX_END_TAIL_MS) {
      return #err("durationMs implausible");
    };

    recomputeScore(events, run.slices);
  };
};

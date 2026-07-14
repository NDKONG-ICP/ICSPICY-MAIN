// lib/slicer-spawn.mo — integer-only deterministic slicer spawn sequence.
// Spec: docs/slicer-determinism.md

import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Types "../types/slicer-spawn";

module {
  public let LCG_MOD : Nat = 2_147_483_648;
  public let LCG_MULT : Nat = 1_103_515_245;
  public let LCG_INC : Nat = 12_345;
  public let FRENZY_INTERVAL_MS : Nat = 45_000;
  public let VIRTUAL_SCORE_PER_SPAWN : Nat = 150;

  let SCORE_THRESHOLDS : [Nat] = [0, 5_000, 15_000, 35_000, 75_000, 150_000];
  let SCORE_PER_LEVEL_AFTER : Nat = 100_000;

  // kind enum weights — index matches kind Nat
  let KIND_WEIGHTS : [Nat] = [18, 16, 14, 12, 10, 8, 2];

  // L1 base pool: tomato, onion, lime
  let POOL_L1 : [Nat] = [1, 2, 0];

  public func lcgNext(state : Nat) : Nat {
    (state * LCG_MULT + LCG_INC) % LCG_MOD;
  };

  func powNat(base : Nat, exp : Nat) : Nat {
    var result : Nat = 1;
    var b = base;
    var e = exp;
    while (e > 0) {
      if (e % 2 == 1) { result *= b };
      b *= b;
      e /= 2;
    };
    result;
  };

  public func levelFromScore(score : Nat) : Nat {
    var level : Nat = 1;
    var i : Nat = 1;
    while (i < SCORE_THRESHOLDS.size()) {
      if (score >= SCORE_THRESHOLDS[i]) {
        level := i + 1;
      } else {
        return level;
      };
      i += 1;
    };
    let last = SCORE_THRESHOLDS[SCORE_THRESHOLDS.size() - 1];
    if (score >= last) {
      level := SCORE_THRESHOLDS.size() + (score - last) / SCORE_PER_LEVEL_AFTER;
    };
    level;
  };

  public func spawnIntervalMs(level : Nat) : Nat {
    let steps = if (level > 0) { level - 1 } else { 0 };
    let num = 1400 * powNat(9, steps) + 5 * powNat(10, steps);
    let den = powNat(10, steps);
    let raw = num / den;
    if (raw < 380) { 380 } else { raw };
  };

  func frenzyBaseCount(level : Nat) : Nat {
    let steps = if (level > 0) { level - 1 } else { 0 };
    let base = 6 + (steps * 3) / 2;
    if (base > 16) { 16 } else { base };
  };

  func poolForLevel(level : Nat) : [Nat] {
    var pool = POOL_L1;
    if (level >= 2) { pool := pool.concat([3]) };
    if (level >= 3) { pool := pool.concat([4]) };
    if (level >= 4) { pool := pool.concat([5]) };
    if (level >= 5) { pool := pool.concat([6]) };
    pool;
  };

  func weightForKind(kind : Nat) : Nat {
    if (kind >= KIND_WEIGHTS.size()) { 0 } else { KIND_WEIGHTS[kind] };
  };

  func pickWeightedKind(state : Nat, level : Nat) : Nat {
    let pool = poolForLevel(level);
    var total : Nat = 0;
    for (k in pool.vals()) { total += weightForKind(k) };
    if (total == 0) { return 0 };
    let roll = state % total;
    var acc : Nat = 0;
    for (k in pool.vals()) {
      let w = weightForKind(k);
      acc += w;
      if (roll < acc) { return k };
    };
    pool[pool.size() - 1];
  };

  public func getSpawnSequence(seed : Nat, count : Nat) : [Types.SpawnEvent] {
    if (count == 0) { return [] };
    var state = seed % LCG_MOD;
    var virtualTime : Nat = 0;
    var virtualScore : Nat = 0;
    var objectId : Nat = 1;
    var spawnIndex : Nat = 0;
    var nextFrenzyAt = FRENZY_INTERVAL_MS + (seed % FRENZY_INTERVAL_MS);
    var events = Array.empty<Types.SpawnEvent>();

    while (events.size() < count) {
      if (virtualTime >= nextFrenzyAt) {
        let level = levelFromScore(virtualScore);
        state := lcgNext(state);
        let extra = state % 3;
        let frenzyCount = frenzyBaseCount(level) + extra;
        var j : Nat = 0;
        while (j < frenzyCount and events.size() < count) {
          state := lcgNext(state);
          let kind = pickWeightedKind(state, level);
          events := events.concat(
            [{
              index = spawnIndex;
              objectId = objectId;
              kind = kind;
              spawnTimeMs = virtualTime;
              isFrenzy = true;
            }],
          );
          spawnIndex += 1;
          objectId += 1;
          j += 1;
        };
        nextFrenzyAt += FRENZY_INTERVAL_MS;
      } else {
        let level = levelFromScore(virtualScore);
        let interval = spawnIntervalMs(level);
        state := lcgNext(state);
        let kind = pickWeightedKind(state, level);
        events := events.concat(
          [{
            index = spawnIndex;
            objectId = objectId;
            kind = kind;
            spawnTimeMs = virtualTime;
            isFrenzy = false;
          }],
        );
        spawnIndex += 1;
        objectId += 1;
        virtualTime += interval;
        virtualScore += VIRTUAL_SCORE_PER_SPAWN;
      };
    };
    events;
  };
};

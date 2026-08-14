// lib/swarm-fleet-registry.mo — admin-managed dynamic swarm canister targets.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Types "../types/swarm-fleet";
import FleetRegistry "fleet-registry";

module {
  public type Store = Map.Map<Text, Types.SwarmCanisterTarget>;
  public type SpendStore = Map.Map<Text, { var dayIndex : Nat; var spentIcpE8s : Nat }>;

  public func emptyStore() : Store {
    Map.empty<Text, Types.SwarmCanisterTarget>();
  };

  public func emptySpendStore() : SpendStore {
    Map.empty<Text, { var dayIndex : Nat; var spentIcpE8s : Nat }>();
  };

  public func validateCanisterId(id : Text) : Bool {
    if (id.size() < 5 or id.size() > 64) return false;
    var segments : [Text] = [];
    var current = "";
    for (c in id.chars()) {
      if (c == '-') {
        if (current.size() == 0) return false;
        segments := Array.concat(segments, [current]);
        current := "";
      } else {
        let ok = (c >= 'a' and c <= 'z') or (c >= '0' and c <= '9');
        if (not ok) return false;
        current #= Text.fromChar(c);
      };
    };
    if (current.size() == 0) return false;
    segments := Array.concat(segments, [current]);
    if (segments.size() < 2) return false;
    if (segments.size() >= 3) {
      let last = segments[segments.size() - 1];
      if (last.size() != 3) return false;
      for (c in last.chars()) {
        if (c < 'a' or c > 'z') return false;
      };
    };
    true;
  };

  public func normalizeInput(input : Types.SwarmCanisterInput) : ?Types.SwarmCanisterInput {
    if (input.name.size() == 0 or input.name.size() > 80) return null;
    if (not validateCanisterId(input.canisterId)) return null;
    if (input.notes.size() > 500) return null;
    switch (input.agentKind) {
      case (?k) if (k.size() > 64) return null;
      case null {};
    };
    ?input;
  };

  public func register(
    store : Store,
    input : Types.SwarmCanisterInput,
    now : Time.Time,
  ) : { #ok : Types.SwarmCanisterTarget; #err : Text } {
    switch (normalizeInput(input)) {
      case null { #err("Invalid swarm canister input") };
      case (?norm) {
        if (store.get(norm.canisterId) != null) {
          return #err("Canister already registered");
        };
        let target : Types.SwarmCanisterTarget = {
          name = norm.name;
          canisterId = norm.canisterId;
          kind = norm.kind;
          category = norm.category;
          agentKind = norm.agentKind;
          enabled = norm.enabled;
          autoTopUpEnabled = norm.autoTopUpEnabled;
          thresholdCycles = norm.thresholdCycles;
          icpPerTopUpE8s = norm.icpPerTopUpE8s;
          maxIcpPerDayE8s = norm.maxIcpPerDayE8s;
          createdAt = now;
          updatedAt = now;
          notes = norm.notes;
        };
        store.add(norm.canisterId, target);
        #ok(target);
      };
    };
  };

  public func update(
    store : Store,
    canisterId : Text,
    input : Types.SwarmCanisterInput,
    now : Time.Time,
  ) : { #ok : Types.SwarmCanisterTarget; #err : Text } {
    switch (store.get(canisterId)) {
      case null { #err("Swarm canister not found") };
      case (?existing) {
        switch (normalizeInput(input)) {
          case null { #err("Invalid swarm canister input") };
          case (?norm) {
            if (norm.canisterId != canisterId and store.get(norm.canisterId) != null) {
              return #err("Target canister id already registered");
            };
            let target : Types.SwarmCanisterTarget = {
              name = norm.name;
              canisterId = norm.canisterId;
              kind = norm.kind;
              category = norm.category;
              agentKind = norm.agentKind;
              enabled = norm.enabled;
              autoTopUpEnabled = norm.autoTopUpEnabled;
              thresholdCycles = norm.thresholdCycles;
              icpPerTopUpE8s = norm.icpPerTopUpE8s;
              maxIcpPerDayE8s = norm.maxIcpPerDayE8s;
              createdAt = existing.createdAt;
              updatedAt = now;
              notes = norm.notes;
            };
            ignore store.delete(canisterId);
            store.add(norm.canisterId, target);
            #ok(target);
          };
        };
      };
    };
  };

  public func remove(store : Store, canisterId : Text) : Bool {
    switch (store.get(canisterId)) {
      case null false;
      case (?_) {
        ignore store.delete(canisterId);
        true;
      };
    };
  };

  public func setAutoTopUpPolicy(
    store : Store,
    canisterId : Text,
    policy : Types.SwarmAutoTopUpPolicy,
    now : Time.Time,
  ) : { #ok : Types.SwarmCanisterTarget; #err : Text } {
    switch (store.get(canisterId)) {
      case null { #err("Swarm canister not found") };
      case (?existing) {
        let updated : Types.SwarmCanisterTarget = {
          existing with
          autoTopUpEnabled = policy.enabled;
          thresholdCycles = policy.thresholdCycles;
          icpPerTopUpE8s = policy.icpPerTopUpE8s;
          maxIcpPerDayE8s = policy.maxIcpPerDayE8s;
          updatedAt = now;
        };
        store.add(canisterId, updated);
        #ok(updated);
      };
    };
  };

  public func list(store : Store, spendStore : SpendStore, dayIndex : Nat) : [Types.SwarmCanisterStatus] {
    var out : [Types.SwarmCanisterStatus] = [];
    for ((id, target) in store.entries()) {
      let spent = spendToday(spendStore, id, dayIndex);
      out := Array.concat(out, [{ target; spentTodayIcpE8s = spent }]);
    };
    out;
  };

  public func spendToday(spendStore : SpendStore, canisterId : Text, dayIndex : Nat) : Nat {
    switch (spendStore.get(canisterId)) {
      case null 0;
      case (?s) if (s.dayIndex == dayIndex) s.spentIcpE8s else 0;
    };
  };

  public func resetSpendIfNeeded(
    spendStore : SpendStore,
    canisterId : Text,
    dayIndex : Nat,
  ) {
    switch (spendStore.get(canisterId)) {
      case null {
        spendStore.add(canisterId, { var dayIndex = dayIndex; var spentIcpE8s = 0 });
      };
      case (?s) {
        if (s.dayIndex != dayIndex) {
          s.dayIndex := dayIndex;
          s.spentIcpE8s := 0;
        };
      };
    };
  };

  public func creditSpend(
    spendStore : SpendStore,
    canisterId : Text,
    dayIndex : Nat,
    icpE8s : Nat,
  ) {
    resetSpendIfNeeded(spendStore, canisterId, dayIndex);
    switch (spendStore.get(canisterId)) {
      case null {};
      case (?s) { s.spentIcpE8s += icpE8s };
    };
  };

  public func isRegistered(store : Store, canisterId : Text) : Bool {
    switch (store.get(canisterId)) {
      case null false;
      case (?t) t.enabled;
    };
  };

  public func isRegisteredAny(store : Store, canisterId : Text) : Bool {
    store.get(canisterId) != null;
  };

  public func toFleetTargets(store : Store) : [FleetRegistry.FleetTarget] {
    var out : [FleetRegistry.FleetTarget] = [];
    for ((_, t) in store.entries()) {
      if (t.enabled) {
        out := Array.concat(out, [FleetRegistry.fromSwarmTarget(t)]);
      };
    };
    out;
  };
};

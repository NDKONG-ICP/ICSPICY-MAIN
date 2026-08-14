import Prim "mo:⛔";
import IC "ic:aaaaa-aa";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";
import FleetRegistry "fleet-registry";

// Int used in FleetEntry.lastBurnSampleAt

module {
  public type Health = {
    cyclesBalance : Nat;
    memoryUsed : Nat;
    heapSize : Nat;
    isHealthy : Bool;
  };

  public type FleetProbeStatus = {
    #ok;
    #denied;
    #error;
  };

  public type FleetEntry = {
    name : Text;
    canisterId : Text;
    category : FleetRegistry.FleetTargetCategory;
    agentKind : ?Text;
    isSwarm : Bool;
    autoTopUpEnabled : Bool;
    autoTopUpThresholdCycles : Nat;
    autoTopUpIcpE8s : Nat;
    autoTopUpMaxIcpPerDayE8s : Nat;
    cyclesBalance : Nat;
    memorySize : Nat;
    isHealthy : Bool;
    probeStatus : FleetProbeStatus;
    probeMessage : ?Text;
    /// Observed burn extrapolated to per-day (0 until second 6h sample).
    burnPerDay : Nat;
    /// Cumulative observed burn since tracking began.
    cumulativeBurned : Nat;
    /// Nanoseconds timestamp of last burn sample (0 = never).
    lastBurnSampleAt : Int;
  };

  type RemoteHealthCanister = actor {
    getCanisterHealth : () -> async Health;
  };

  let HEALTHY_CYCLES : Nat = 500_000_000_000; // 0.5T
  let WARNING_CYCLES : Nat = 1_000_000_000_000; // 1T

  public func localHealth() : Health {
    let balance = Prim.cyclesBalance();
    {
      cyclesBalance = balance;
      memoryUsed = Prim.rts_memory_size();
      heapSize = Prim.rts_heap_size();
      isHealthy = balance > HEALTHY_CYCLES;
    };
  };

  public func isWarningLevel(cycles : Nat) : Bool {
    cycles < WARNING_CYCLES;
  };

  public func isCriticalLevel(cycles : Nat) : Bool {
    cycles < HEALTHY_CYCLES;
  };

  func entryFromHealth(target : FleetRegistry.FleetTarget, h : Health) : FleetEntry {
    {
      name = target.name;
      canisterId = target.canisterId;
      category = target.category;
      agentKind = target.agentKind;
      isSwarm = target.isSwarm;
      autoTopUpEnabled = target.autoTopUpEnabled;
      autoTopUpThresholdCycles = target.autoTopUpThresholdCycles;
      autoTopUpIcpE8s = target.autoTopUpIcpE8s;
      autoTopUpMaxIcpPerDayE8s = target.autoTopUpMaxIcpPerDayE8s;
      cyclesBalance = h.cyclesBalance;
      memorySize = h.memoryUsed;
      isHealthy = h.isHealthy;
      probeStatus = #ok;
      probeMessage = null;
      burnPerDay = 0;
      cumulativeBurned = 0;
      lastBurnSampleAt = 0;
    };
  };

  func unavailableEntry(
    target : FleetRegistry.FleetTarget,
    probeStatus : FleetProbeStatus,
    message : Text,
  ) : FleetEntry {
    {
      name = target.name;
      canisterId = target.canisterId;
      category = target.category;
      agentKind = target.agentKind;
      isSwarm = target.isSwarm;
      autoTopUpEnabled = target.autoTopUpEnabled;
      autoTopUpThresholdCycles = target.autoTopUpThresholdCycles;
      autoTopUpIcpE8s = target.autoTopUpIcpE8s;
      autoTopUpMaxIcpPerDayE8s = target.autoTopUpMaxIcpPerDayE8s;
      cyclesBalance = 0;
      memorySize = 0;
      isHealthy = false;
      probeStatus;
      probeMessage = ?message;
      burnPerDay = 0;
      cumulativeBurned = 0;
      lastBurnSampleAt = 0;
    };
  };

  public func fetchRemoteHealth(target : FleetRegistry.FleetTarget) : async FleetEntry {
    let canisterId = Principal.fromText(target.canisterId);
    let status = await IC.canister_status({ canister_id = canisterId });
    {
      name = target.name;
      canisterId = target.canisterId;
      category = target.category;
      agentKind = target.agentKind;
      isSwarm = target.isSwarm;
      autoTopUpEnabled = target.autoTopUpEnabled;
      autoTopUpThresholdCycles = target.autoTopUpThresholdCycles;
      autoTopUpIcpE8s = target.autoTopUpIcpE8s;
      autoTopUpMaxIcpPerDayE8s = target.autoTopUpMaxIcpPerDayE8s;
      cyclesBalance = status.cycles;
      memorySize = status.memory_size;
      isHealthy = status.cycles > HEALTHY_CYCLES;
      probeStatus = #ok;
      probeMessage = null;
      burnPerDay = 0;
      cumulativeBurned = 0;
      lastBurnSampleAt = 0;
    };
  };

  public func probeTarget(target : FleetRegistry.FleetTarget) : async FleetEntry {
    switch (target.kind) {
      case (#local) {
        entryFromHealth(target, localHealth());
      };
      case (#managementStatus) {
        try {
          await fetchRemoteHealth(target);
        } catch (_) {
          unavailableEntry(
            target,
            #denied,
            "Cannot read status — backend is not a controller of this canister",
          );
        };
      };
      case (#remoteHealthQuery) {
        try {
          let remote : RemoteHealthCanister = actor (target.canisterId);
          let h = await remote.getCanisterHealth();
          entryFromHealth(target, h);
        } catch (_) {
          unavailableEntry(
            target,
            #error,
            "Health query failed — deploy getCanisterHealth or check canister id",
          );
        };
      };
    };
  };

  public func probeFleet(
    targets : [FleetRegistry.FleetTarget],
  ) : async [FleetEntry] {
    var out : [FleetEntry] = [];
    for (t in targets.vals()) {
      let entry = await probeTarget(t);
      out := Array.concat(out, [entry]);
    };
    out;
  };
};

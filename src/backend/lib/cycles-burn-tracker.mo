/// Observed cycle burn from balance samples (6h cadence), top-up aware.
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import CanisterHealth "canister-health";

module {
  public type Tracker = {
    var lastBalance : Nat;
    var lastSampleAt : Int;
    var pendingTopUpCycles : Nat;
    var burnPerDay : Nat;
    var cumulativeBurned : Nat;
    var sampleCount : Nat;
  };

  public type Snapshot = {
    burnPerDay : Nat;
    cumulativeBurned : Nat;
    lastSampleAt : Int;
  };

  public type Store = Map.Map<Text, Tracker>;

  let DAY_NS : Int = 86_400_000_000_000;
  /// Minimum interval before recomputing burn rate.
  /// Timer still runs every 6h; admin refresh can produce a rate after 1h.
  let MIN_SAMPLE_NS : Int = 3_600_000_000_000;

  public func empty() : Store {
    Map.empty<Text, Tracker>();
  };

  public func creditTopUp(store : Store, canisterId : Text, cycles : Nat) {
    if (cycles == 0) return;
    switch (store.get(canisterId)) {
      case (?t) {
        t.pendingTopUpCycles += cycles;
      };
      case null {
        let t : Tracker = {
          var lastBalance = 0;
          var lastSampleAt = 0;
          var pendingTopUpCycles = cycles;
          var burnPerDay = 0;
          var cumulativeBurned = 0;
          var sampleCount = 0;
        };
        store.add(canisterId, t);
      };
    };
  };

  public func snapshot(store : Store, canisterId : Text) : Snapshot {
    switch (store.get(canisterId)) {
      case (?t) {
        {
          burnPerDay = t.burnPerDay;
          cumulativeBurned = t.cumulativeBurned;
          lastSampleAt = t.lastSampleAt;
        };
      };
      case null {
        { burnPerDay = 0; cumulativeBurned = 0; lastSampleAt = 0 };
      };
    };
  };

  /// Sample one canister. Updates rate only when enough time has elapsed (or first sample).
  public func sampleOne(
    store : Store,
    canisterId : Text,
    cyclesBalance : Nat,
    now : Time.Time,
  ) {
    switch (store.get(canisterId)) {
      case null {
        let t : Tracker = {
          var lastBalance = cyclesBalance;
          var lastSampleAt = now;
          var pendingTopUpCycles = 0;
          var burnPerDay = 0;
          var cumulativeBurned = 0;
          var sampleCount = 1;
        };
        store.add(canisterId, t);
      };
      case (?t) {
        if (t.lastSampleAt == 0 or t.sampleCount == 0) {
          t.lastBalance := cyclesBalance;
          t.lastSampleAt := now;
          t.sampleCount := 1;
          return;
        };
        let elapsed = now - t.lastSampleAt;
        if (elapsed < MIN_SAMPLE_NS) {
          return;
        };
        let credited = t.lastBalance + t.pendingTopUpCycles;
        let burned = if (credited > cyclesBalance) { credited - cyclesBalance } else { 0 };
        t.cumulativeBurned += burned;
        // Extrapolate to per-day from this window
        let elapsedNat = Nat.fromInt(Int.abs(elapsed));
        if (elapsedNat > 0) {
          t.burnPerDay := (burned * Nat.fromInt(DAY_NS)) / elapsedNat;
        };
        t.lastBalance := cyclesBalance;
        t.lastSampleAt := now;
        t.pendingTopUpCycles := 0;
        t.sampleCount += 1;
      };
    };
  };

  public func sampleFleet(
    store : Store,
    fleet : [CanisterHealth.FleetEntry],
    now : Time.Time,
  ) {
    for (e in fleet.vals()) {
      switch (e.probeStatus) {
        case (#ok) {
          sampleOne(store, e.canisterId, e.cyclesBalance, now);
        };
        case (_) {};
      };
    };
  };

  public func attachBurnFields(
    store : Store,
    entry : CanisterHealth.FleetEntry,
  ) : CanisterHealth.FleetEntry {
    let s = snapshot(store, entry.canisterId);
    {
      name = entry.name;
      canisterId = entry.canisterId;
      category = entry.category;
      agentKind = entry.agentKind;
      isSwarm = entry.isSwarm;
      autoTopUpEnabled = entry.autoTopUpEnabled;
      autoTopUpThresholdCycles = entry.autoTopUpThresholdCycles;
      autoTopUpIcpE8s = entry.autoTopUpIcpE8s;
      autoTopUpMaxIcpPerDayE8s = entry.autoTopUpMaxIcpPerDayE8s;
      cyclesBalance = entry.cyclesBalance;
      memorySize = entry.memorySize;
      isHealthy = entry.isHealthy;
      probeStatus = entry.probeStatus;
      probeMessage = entry.probeMessage;
      burnPerDay = s.burnPerDay;
      cumulativeBurned = s.cumulativeBurned;
      lastBurnSampleAt = s.lastSampleAt;
    };
  };

  public func enrichFleet(
    store : Store,
    fleet : [CanisterHealth.FleetEntry],
  ) : [CanisterHealth.FleetEntry] {
    Array.map<CanisterHealth.FleetEntry, CanisterHealth.FleetEntry>(
      fleet,
      func(e) = attachBurnFields(store, e),
    );
  };

  public func appTotals(enriched : [CanisterHealth.FleetEntry]) : (Nat, Nat) {
    var burn : Nat = 0;
    var cum : Nat = 0;
    for (e in enriched.vals()) {
      burn += e.burnPerDay;
      cum += e.cumulativeBurned;
    };
    (burn, cum);
  };
};

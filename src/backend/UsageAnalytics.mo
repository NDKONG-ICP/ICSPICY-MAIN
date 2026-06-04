import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";

module {
  public type DayBucket = Nat;

  public type EventKey = Text;

  public type DailyFeatureStat = {
    day : DayBucket;
    feature : Text;
    action : Text;
    count : Nat;
    uniqueUsers : Nat;
  };

  public type UsageState = {
    var rollups : Map.Map<EventKey, Nat>;
    var uniqueSets : Map.Map<EventKey, Map.Map<Text, Bool>>;
  };

  public func newState() : UsageState {
    {
      var rollups = Map.empty<EventKey, Nat>();
      var uniqueSets = Map.empty<EventKey, Map.Map<Text, Bool>>();
    };
  };

  func dayBucket() : DayBucket {
    Int.abs(Time.now()) / 1_000_000_000 / 86400;
  };

  func hashPrincipal(p : Principal) : Text {
    let t = p.toText();
    if (t.size() >= 8) {
      Text.fromIter(t.chars().take(8));
    } else {
      t;
    };
  };

  public func record(state : UsageState, caller : Principal, feature : Text, action : Text) {
    let day = dayBucket();
    let key = Nat.toText(day) # ":" # feature # ":" # action;
    let callerHash = hashPrincipal(caller);

    let current = switch (state.rollups.get(key)) {
      case null 0;
      case (?n) n;
    };
    state.rollups.add(key, current + 1);

    let userSet = switch (state.uniqueSets.get(key)) {
      case null {
        let s = Map.empty<Text, Bool>();
        state.uniqueSets.add(key, s);
        s;
      };
      case (?s) s;
    };
    userSet.add(callerHash, true);
  };

  public func getRollups(state : UsageState, days : Nat) : [DailyFeatureStat] {
    let today = dayBucket();
    let cutoff = if (today >= days) today - days else 0;

    var results : [DailyFeatureStat] = [];

    for ((key, count) in state.rollups.entries()) {
      let partsArray = Iter.toArray(Text.split(key, #char ':'));
      if (partsArray.size() == 3) {
        let dayOpt = Nat.fromText(partsArray[0]);
        switch (dayOpt) {
          case null {};
          case (?day) {
            if (day >= cutoff) {
              let feature = partsArray[1];
              let action = partsArray[2];
              let uniqueCount = switch (state.uniqueSets.get(key)) {
                case null 0;
                case (?s) s.size();
              };
              results := Array.concat(
                results,
                [
                  {
                    day;
                    feature;
                    action;
                    count;
                    uniqueUsers = uniqueCount;
                  },
                ],
              );
            };
          };
        };
      };
    };
    results;
  };

  public func prune(state : UsageState, keepDays : Nat) {
    let today = dayBucket();
    let cutoff = if (today >= keepDays) today - keepDays else 0;

    let keysToDelete = Array.filter<EventKey>(
      Iter.toArray(state.rollups.keys()),
      func(key) {
        let parts = Iter.toArray(Text.split(key, #char ':'));
        if (parts.size() == 3) {
          switch (Nat.fromText(parts[0])) {
            case null true;
            case (?day) day < cutoff;
          };
        } else {
          true;
        };
      },
    );

    for (k in keysToDelete.vals()) {
      ignore state.rollups.delete(k);
      ignore state.uniqueSets.delete(k);
    };
  };
};

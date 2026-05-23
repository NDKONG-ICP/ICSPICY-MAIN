import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";

module {
  public type Config = {
    maxCallsPerWindow : Nat;
    windowSizeNanos : Int;
  };

  public type Limiter = {
    var callLog : Map.Map<Principal, [Int]>;
    config : Config;
  };

  public func init(config : Config) : Limiter {
    { var callLog = Map.empty<Principal, [Int]>(); config };
  };

  public func check(limiter : Limiter, caller : Principal) : Bool {
    let now = Time.now();
    let windowStart = now - limiter.config.windowSizeNanos;
    switch (limiter.callLog.get(caller)) {
      case null {
        limiter.callLog.add(caller, [now]);
        true;
      };
      case (?times) {
        let recent = Array.filter(times, func(t : Int) : Bool { t > windowStart });
        if (recent.size() >= limiter.config.maxCallsPerWindow) {
          false;
        } else {
          limiter.callLog.add(caller, Array.concat(recent, [now]));
          true;
        };
      };
    };
  };

  public func trapIfLimited(limiter : Limiter, caller : Principal, message : Text) {
    if (not check(limiter, caller)) {
      Runtime.trap(message);
    };
  };

  /// Drop stale entries to bound memory growth.
  public func cleanup(limiter : Limiter) {
    let now = Time.now();
    let windowStart = now - limiter.config.windowSizeNanos;
    for ((principal, times) in limiter.callLog.entries()) {
      let recent = Array.filter(times, func(t : Int) : Bool { t > windowStart });
      if (recent.size() == 0) {
        limiter.callLog.delete(principal);
      } else {
        limiter.callLog.add(principal, recent);
      };
    };
  };
};

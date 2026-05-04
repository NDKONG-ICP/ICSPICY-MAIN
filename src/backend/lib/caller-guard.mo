import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";

module {
  public type GuardMap = Map.Map<Principal, Bool>;

  public func empty() : GuardMap { Map.empty<Principal, Bool>() };

  // Returns #err if caller already has a request in flight; otherwise acquires the lock.
  public func acquire(guards : GuardMap, caller : Principal) : Result.Result<(), Text> {
    switch (guards.get(caller)) {
      case (?_) { #err("request already in flight for this caller") };
      case null  { guards.add(caller, true); #ok };
    };
  };

  public func release(guards : GuardMap, caller : Principal) {
    ignore guards.delete(caller);
  };
};

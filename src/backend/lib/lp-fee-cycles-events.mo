import Array "mo:core/Array";
import Time "mo:core/Time";

module {
  public type CanisterFundingDetail = {
    name : Text;
    canisterId : Text;
    icpSpentE8s : Nat;
    cyclesMinted : Nat;
  };

  public type LpFeeCyclesEvent = {
    ts : Time.Time;
    trigger : Text;
    icpHarvestedE8s : Nat;
    spicyFeesSkippedE8s : Nat;
    totalCyclesMinted : Nat;
    canistersToppedUp : Nat;
    details : [CanisterFundingDetail];
    success : Bool;
    message : Text;
  };

  let MAX_EVENTS : Nat = 100;

  func head(n : Nat, items : [LpFeeCyclesEvent]) : [LpFeeCyclesEvent] {
    Array.tabulate<LpFeeCyclesEvent>(
      n,
      func(i) { items[i] },
    );
  };

  public func appendEvent(
    events : [LpFeeCyclesEvent],
    entry : LpFeeCyclesEvent,
  ) : [LpFeeCyclesEvent] {
    let next = Array.concat([entry], events);
    if (next.size() <= MAX_EVENTS) next else head(MAX_EVENTS, next);
  };

  public func listEvents(events : [LpFeeCyclesEvent], limit : Nat) : [LpFeeCyclesEvent] {
    let cap = if (limit > MAX_EVENTS) MAX_EVENTS else if (limit == 0) 20 else limit;
    if (events.size() <= cap) events else head(cap, events);
  };
};

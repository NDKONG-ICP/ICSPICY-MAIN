// types/swarm-fleet.mo — dynamic agent/swarm canister fleet registry types.

module {
  public type FleetTargetCategory = {
    #core;
    #asset;
    #agent;
    #weather;
    #workerBridge;
  };

  public type ProbeKind = {
    #local;
    #managementStatus;
    #remoteHealthQuery;
  };

  public type SwarmCanisterTarget = {
    name : Text;
    canisterId : Text;
    kind : ProbeKind;
    category : FleetTargetCategory;
    agentKind : ?Text;
    enabled : Bool;
    autoTopUpEnabled : Bool;
    thresholdCycles : Nat;
    icpPerTopUpE8s : Nat;
    maxIcpPerDayE8s : Nat;
    createdAt : Int;
    updatedAt : Int;
    notes : Text;
  };

  public type SwarmCanisterInput = {
    name : Text;
    canisterId : Text;
    kind : ProbeKind;
    category : FleetTargetCategory;
    agentKind : ?Text;
    enabled : Bool;
    autoTopUpEnabled : Bool;
    thresholdCycles : Nat;
    icpPerTopUpE8s : Nat;
    maxIcpPerDayE8s : Nat;
    notes : Text;
  };

  public type SwarmAutoTopUpPolicy = {
    enabled : Bool;
    thresholdCycles : Nat;
    icpPerTopUpE8s : Nat;
    maxIcpPerDayE8s : Nat;
  };

  public type SwarmCanisterStatus = {
    target : SwarmCanisterTarget;
    spentTodayIcpE8s : Nat;
  };
};

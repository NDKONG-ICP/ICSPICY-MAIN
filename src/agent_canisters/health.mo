// Shared health snapshot types for dedicated swarm agent canisters.

import ExperimentalCycles "mo:base/ExperimentalCycles";
import Prim "mo:⛔";

module {
  public type CanisterHealthSnapshot = {
    cyclesBalance : Nat;
    memoryUsed : Nat;
    heapSize : Nat;
    isHealthy : Bool;
  };

  public type AgentCanisterHealth = {
    agentKind : Text;
    status : Text;
    lastRunAt : Int;
    nextRunAt : Int;
    cyclesBalance : Nat;
    memorySize : Nat;
  };

  public func canisterHealth() : CanisterHealthSnapshot {
    let balance = ExperimentalCycles.balance();
    {
      cyclesBalance = balance;
      memoryUsed = Prim.rts_memory_size();
      heapSize = Prim.rts_heap_size();
      isHealthy = balance > 500_000_000_000;
    };
  };

  public func agentHealth(
    agentKind : Text,
    status : Text,
    lastRunAt : Int,
    nextRunAt : Int,
  ) : AgentCanisterHealth {
    let balance = ExperimentalCycles.balance();
    {
      agentKind;
      status;
      lastRunAt;
      nextRunAt;
      cyclesBalance = balance;
      memorySize = Prim.rts_memory_size();
    };
  };
};

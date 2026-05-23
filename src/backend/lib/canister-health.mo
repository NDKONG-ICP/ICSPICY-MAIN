import Prim "mo:⛔";
import IC "ic:aaaaa-aa";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  public type Health = {
    cyclesBalance : Nat;
    memoryUsed : Nat;
    heapSize : Nat;
    isHealthy : Bool;
  };

  public type FleetEntry = {
    name : Text;
    canisterId : Text;
    cyclesBalance : Nat;
    memorySize : Nat;
    isHealthy : Bool;
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

  public func fetchRemoteHealth(name : Text, canisterIdText : Text) : async FleetEntry {
    let canisterId = Principal.fromText(canisterIdText);
    let status = await IC.canister_status({ canister_id = canisterId });
    {
      name;
      canisterId = canisterIdText;
      cyclesBalance = status.cycles;
      memorySize = status.memory_size;
      isHealthy = status.cycles > HEALTHY_CYCLES;
    };
  };
};

// fleet_cycles_ops_canister — ops automation run log + fleet report mirror.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AgentHealth "../agent_canisters/health";

shared (msg) persistent actor class FleetCyclesOpsCanister() = {
  transient let deployer = msg.caller;
  let admins = Map.empty<Principal, Bool>();
  admins.add(deployer, true);

  stable var backendCanisterId : Text = "";
  stable var lastRunAt : Int = 0;
  stable var nextRunAt : Int = 0;
  stable var lastStatus : Text = "idle";
  stable var lastFleetReport : Text = "";
  stable var runLog : [Text] = [];

  func requireAdmin(caller : Principal) {
    if (Principal.isAnonymous(caller)) Runtime.trap("anonymous");
    switch (admins.get(caller)) {
      case (?true) {};
      case _ Runtime.trap("admin only");
    };
  };

  public query func getCanisterHealth() : async AgentHealth.CanisterHealthSnapshot {
    AgentHealth.canisterHealth();
  };

  public query func getAgentCanisterHealth() : async AgentHealth.AgentCanisterHealth {
    AgentHealth.agentHealth("fleet_cycles_ops", lastStatus, lastRunAt, nextRunAt);
  };

  public query func getBackendCanisterId() : async Text { backendCanisterId };

  public query func getLastFleetReport() : async Text { lastFleetReport };

  public query func listRunLog(limit : Nat) : async [Text] {
    if (runLog.size() == 0 or limit == 0) return [];
    let n = if (limit > runLog.size()) runLog.size() else limit;
    runLog.sliceToArray(runLog.size() - n, runLog.size());
  };

  public shared ({ caller }) func adminSetBackendCanisterId(id : Text) : async () {
    requireAdmin(caller);
    backendCanisterId := id;
  };

  public shared ({ caller }) func adminReportRun(
    status : Text,
    fleetReport : Text,
    nextAt : Int,
  ) : async () {
    requireAdmin(caller);
    lastRunAt := Time.now();
    nextRunAt := nextAt;
    lastStatus := status;
    lastFleetReport := fleetReport;
    runLog := Array.concat(runLog, [fleetReport]);
    if (runLog.size() > 50) {
      let start = runLog.size() - 50 : Nat;
      runLog := runLog.sliceToArray(start, runLog.size());
    };
  };
};

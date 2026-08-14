// weather_sentinel_canister — tropical/NWS watch state + escalation log.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AgentHealth "../agent_canisters/health";

shared (msg) persistent actor class WeatherSentinelCanister() = {
  transient let deployer = msg.caller;
  let admins = Map.empty<Principal, Bool>();
  admins.add(deployer, true);

  stable var backendCanisterId : Text = "";
  stable var lastRunAt : Int = 0;
  stable var nextRunAt : Int = 0;
  stable var lastStatus : Text = "idle";
  stable var lastTropicalCheckAt : Int = 0;
  stable var lastNwsCheckAt : Int = 0;
  stable var escalationLog : [Text] = [];

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
    AgentHealth.agentHealth("weather_sentinel", lastStatus, lastRunAt, nextRunAt);
  };

  public query func getBackendCanisterId() : async Text { backendCanisterId };

  public query func getWatchState() : async {
    lastTropicalCheckAt : Int;
    lastNwsCheckAt : Int;
    escalationLog : [Text];
  } {
    { lastTropicalCheckAt; lastNwsCheckAt; escalationLog };
  };

  public shared ({ caller }) func adminSetBackendCanisterId(id : Text) : async () {
    requireAdmin(caller);
    backendCanisterId := id;
  };

  public shared ({ caller }) func adminReportRun(
    status : Text,
    detail : Text,
    nextAt : Int,
    tropicalCheckedAt : Int,
    nwsCheckedAt : Int,
  ) : async () {
    requireAdmin(caller);
    lastRunAt := Time.now();
    nextRunAt := nextAt;
    lastStatus := status;
    lastTropicalCheckAt := tropicalCheckedAt;
    lastNwsCheckAt := nwsCheckedAt;
    if (detail.size() > 0) {
      escalationLog := Array.concat(escalationLog, [detail]);
      if (escalationLog.size() > 100) {
        let start = escalationLog.size() - 100 : Nat;
        escalationLog := escalationLog.sliceToArray(start, escalationLog.size());
      };
    };
  };
};

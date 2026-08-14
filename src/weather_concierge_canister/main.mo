// weather_concierge_canister — almanac publish ledger + compliance boundary.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AgentHealth "../agent_canisters/health";

shared (msg) persistent actor class WeatherConciergeCanister() = {
  transient let deployer = msg.caller;
  let admins = Map.empty<Principal, Bool>();
  admins.add(deployer, true);

  stable var backendCanisterId : Text = "";
  stable var lastRunAt : Int = 0;
  stable var nextRunAt : Int = 0;
  stable var lastStatus : Text = "idle";
  stable var lastDetail : Text = "";
  stable var publishLedger : [Text] = [];
  stable var complianceNotes : Text = "";

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
    AgentHealth.agentHealth("weather_concierge", lastStatus, lastRunAt, nextRunAt);
  };

  public query func getBackendCanisterId() : async Text { backendCanisterId };

  public query func listPublishLedger() : async [Text] { publishLedger };

  public query func getComplianceNotes() : async Text { complianceNotes };

  public shared ({ caller }) func adminSetBackendCanisterId(id : Text) : async () {
    requireAdmin(caller);
    backendCanisterId := id;
  };

  public shared ({ caller }) func adminReportRun(status : Text, detail : Text, nextAt : Int) : async () {
    requireAdmin(caller);
    lastRunAt := Time.now();
    nextRunAt := nextAt;
    lastStatus := status;
    lastDetail := detail;
  };

  public shared ({ caller }) func adminRecordAlmanacPublish(dateKey : Text) : async () {
    requireAdmin(caller);
    publishLedger := Array.concat(publishLedger, [dateKey]);
    if (publishLedger.size() > 60) {
      let start = publishLedger.size() - 60 : Nat;
      publishLedger := publishLedger.sliceToArray(start, publishLedger.size());
    };
  };

  public shared ({ caller }) func adminSetComplianceNotes(notes : Text) : async () {
    requireAdmin(caller);
    if (notes.size() > 2_000) Runtime.trap("compliance notes too long");
    complianceNotes := notes;
  };
};

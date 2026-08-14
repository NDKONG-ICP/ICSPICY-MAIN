// newsletter_canister — subscriber/draft cadence mirror for agent swarm.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AgentHealth "../agent_canisters/health";

shared (msg) persistent actor class NewsletterCanister() = {
  transient let deployer = msg.caller;
  let admins = Map.empty<Principal, Bool>();
  admins.add(deployer, true);

  stable var agentHubCanisterId : Text = "";
  stable var lastRunAt : Int = 0;
  stable var nextRunAt : Int = 0;
  stable var lastStatus : Text = "idle";
  stable var draftsThisWeek : Nat = 0;
  stable var sendsThisWeek : Nat = 0;
  stable var weekKey : Text = "";
  stable var cadenceLog : [Text] = [];

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
    AgentHealth.agentHealth("newsletter", lastStatus, lastRunAt, nextRunAt);
  };

  public query func getAgentHubCanisterId() : async Text { agentHubCanisterId };

  public query func getCadenceStats() : async {
    weekKey : Text;
    draftsThisWeek : Nat;
    sendsThisWeek : Nat;
  } {
    { weekKey; draftsThisWeek; sendsThisWeek };
  };

  public shared ({ caller }) func adminSetAgentHubCanisterId(id : Text) : async () {
    requireAdmin(caller);
    agentHubCanisterId := id;
  };

  public shared ({ caller }) func adminReportRun(
    status : Text,
    detail : Text,
    nextAt : Int,
    currentWeekKey : Text,
    draftCount : Nat,
    sendCount : Nat,
  ) : async () {
    requireAdmin(caller);
    lastRunAt := Time.now();
    nextRunAt := nextAt;
    lastStatus := status;
    weekKey := currentWeekKey;
    draftsThisWeek := draftCount;
    sendsThisWeek := sendCount;
    cadenceLog := Array.concat(cadenceLog, [detail]);
    if (cadenceLog.size() > 52) {
      let start = cadenceLog.size() - 52 : Nat;
      cadenceLog := cadenceLog.sliceToArray(start, cadenceLog.size());
    };
  };
};

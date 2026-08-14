import Array "mo:core/Array";
import Text "mo:core/Text";
import SwarmTypes "../types/swarm-fleet";

module {
  public type ProbeKind = SwarmTypes.ProbeKind;
  public type FleetTargetCategory = SwarmTypes.FleetTargetCategory;

  public type FleetTarget = {
    name : Text;
    canisterId : Text;
    kind : ProbeKind;
    category : FleetTargetCategory;
    agentKind : ?Text;
    isSwarm : Bool;
    autoTopUpEnabled : Bool;
    autoTopUpThresholdCycles : Nat;
    autoTopUpIcpE8s : Nat;
    autoTopUpMaxIcpPerDayE8s : Nat;
  };

  public func fromSwarmTarget(t : SwarmTypes.SwarmCanisterTarget) : FleetTarget {
    {
      name = t.name;
      canisterId = t.canisterId;
      kind = t.kind;
      category = t.category;
      agentKind = t.agentKind;
      isSwarm = true;
      autoTopUpEnabled = t.autoTopUpEnabled;
      autoTopUpThresholdCycles = t.thresholdCycles;
      autoTopUpIcpE8s = t.icpPerTopUpE8s;
      autoTopUpMaxIcpPerDayE8s = t.maxIcpPerDayE8s;
    };
  };

  func coreTarget(
    name : Text,
    canisterId : Text,
    kind : ProbeKind,
    category : FleetTargetCategory,
    agentKind : ?Text,
  ) : FleetTarget {
    {
      name;
      canisterId;
      kind;
      category;
      agentKind;
      isSwarm = false;
      autoTopUpEnabled = false;
      autoTopUpThresholdCycles = 0;
      autoTopUpIcpE8s = 0;
      autoTopUpMaxIcpPerDayE8s = 0;
    };
  };

  let FRONTEND_ID : Text = "7rukv-hqaaa-aaaao-ba6ma-cai";
  let NFT_ASSETS_ID : Text = "gawk3-2qaaa-aaaao-ba4sa-cai";
  let UPLOADS_DEFAULT_ID : Text = "r53pg-maaaa-aaaao-ba7na-cai";
  let DOCS_BACKEND_ID : Text = "pyyki-iiaaa-aaaao-ba5aq-cai";
  let DOCS_FRONTEND_ID : Text = "pr3bu-6aaaa-aaaao-ba5ba-cai";
  let SPICY_AI_ID : Text = "pd5wn-sqaaa-aaaao-ba5ca-cai";
  let WEATHER_MCP_ID : Text = "z2j4p-4aaaa-aaaao-bbe3q-cai";

  public func resolveUploadsCanisterId(uploadsCanisterIdStable : ?Text) : Text {
    switch (uploadsCanisterIdStable) {
      case null UPLOADS_DEFAULT_ID;
      case (?id) id;
    };
  };

  /// Production fleet — backend id is filled by caller (Principal.fromActor Self).
  public func productionTargets(
    backendId : Text,
    uploadsCanisterIdStable : ?Text,
  ) : [FleetTarget] {
    let uploadsCanisterId = resolveUploadsCanisterId(uploadsCanisterIdStable);
    [
      coreTarget("backend", backendId, #local, #core, null),
      coreTarget("frontend", FRONTEND_ID, #managementStatus, #core, null),
      coreTarget("nft_assets", NFT_ASSETS_ID, #managementStatus, #asset, null),
      coreTarget("uploads", uploadsCanisterId, #managementStatus, #asset, null),
      coreTarget("docs_backend", DOCS_BACKEND_ID, #remoteHealthQuery, #core, null),
      coreTarget("docs_frontend", DOCS_FRONTEND_ID, #managementStatus, #core, null),
      coreTarget("spicy_ai", SPICY_AI_ID, #remoteHealthQuery, #agent, ?"spicy_ai"),
      coreTarget("weather_mcp", WEATHER_MCP_ID, #remoteHealthQuery, #weather, ?"weather_mcp"),
    ];
  };

  public func allTargets(
    backendId : Text,
    uploadsCanisterIdStable : ?Text,
    swarmTargets : [FleetTarget],
  ) : [FleetTarget] {
    productionTargets(backendId, uploadsCanisterIdStable).concat(swarmTargets);
  };
};

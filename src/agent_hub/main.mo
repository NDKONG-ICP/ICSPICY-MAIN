// IC SPICY — Agent Hub canister
// Job queue, draft approval, newsletter subscribers, audit log, and swarm orchestration.

import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Char "mo:core/Char";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Nat64 "mo:core/Nat64";
import Option "mo:core/Option";
import Principal "mo:core/Principal";
import Random "mo:core/Random";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Timer "mo:core/Timer";
import Prim "mo:⛔";

import Migration "migrations/PhaseAgentHubAmbassadors";

(with migration = Migration.migration)
shared(msg) persistent actor class AgentHub() = Self {

  // ── Types ───────────────────────────────────────────────────────────────────

  public type AgentKind = {
    #orchestrator;
    #newsletter;
    #email_correspondence;
    #social_x;
    #social_instagram;
    #social_tiktok;
    #social_facebook;
    #social_youtube;
    #compliance_reviewer;
    #fleet_cycles_ops;
    #weather_sentinel;
    #weather_concierge;
    #nims_ops;
    #orders_claims_ops;
    #community_moderator;
    #analytics_digest;
    #ambassador_crumbeatr;
    #ambassador_swop;
    #ambassador_bonsai;
  };

  public type AgentStatus = { #active; #paused; #disabled };

  public type AgentRecord = {
    id : Nat;
    name : Text;
    kind : AgentKind;
    var status : AgentStatus;
    var cadenceSeconds : Nat;
    var budgetDailyJobs : Nat;
    var budgetDailyLlmCalls : Nat;
    var lastRunAt : Int;
    var nextRunAt : Int;
    var jobsToday : Nat;
    var llmCallsToday : Nat;
    var dayKey : Text;
  };

  public type JobStatus = { #queued; #claimed; #done; #failed };

  public type JobRecord = {
    id : Nat;
    agentId : Nat;
    kind : AgentKind;
    var status : JobStatus;
    payload : Text;
    var claimedBy : ?Principal;
    var claimedAt : ?Int;
    createdAt : Int;
    var completedAt : ?Int;
    var error : ?Text;
  };

  public type DraftStatus = { #pending; #approved; #rejected; #sent };

  public type DraftRecord = {
    id : Nat;
    agentKind : AgentKind;
    jobId : ?Nat;
    var title : Text;
    var body : Text;
    platform : ?Text;
    var status : DraftStatus;
    var compliancePassed : Bool;
    var complianceNotes : Text;
    createdAt : Int;
    var reviewedAt : ?Int;
    var reviewedBy : ?Principal;
    var sentAt : ?Int;
    metadata : Text;
  };

  public type SubscriberStatus = { #pending; #confirmed; #unsubscribed };

  public type SubscriberRecord = {
    email : Text;
    confirmToken : Text;
    unsubscribeToken : Text;
    var status : SubscriberStatus;
    subscribedAt : Int;
    var confirmedAt : ?Int;
  };

  public type SubscriberPublic = {
    email : Text;
    status : SubscriberStatus;
    subscribedAt : Int;
    confirmedAt : ?Int;
  };

  public type AuditEntry = {
    id : Nat;
    at : Int;
    actorLabel : Text;
    action : Text;
    detail : Text;
  };

  public type NewsletterIssue = {
    weekKey : Text;
    subject : Text;
    htmlBody : Text;
    draftId : Nat;
    sentAt : Int;
    recipientCount : Nat;
  };

  public type AgentCanisterLink = {
    agentId : Nat;
    agentKind : AgentKind;
    agentName : Text;
    canisterId : Principal;
  };

  public type AgentCanisterHealth = {
    agentKind : Text;
    status : Text;
    lastRunAt : Int;
    nextRunAt : Int;
    cyclesBalance : Nat;
    memorySize : Nat;
  };

  public type AgentPublic = {
    id : Nat;
    name : Text;
    kind : AgentKind;
    status : AgentStatus;
    cadenceSeconds : Nat;
    budgetDailyJobs : Nat;
    budgetDailyLlmCalls : Nat;
    lastRunAt : Int;
    nextRunAt : Int;
    jobsToday : Nat;
    llmCallsToday : Nat;
  };

  public type JobPublic = {
    id : Nat;
    agentId : Nat;
    kind : AgentKind;
    status : JobStatus;
    payload : Text;
    claimedBy : ?Principal;
    claimedAt : ?Int;
    createdAt : Int;
    completedAt : ?Int;
    error : ?Text;
  };

  public type DraftPublic = {
    id : Nat;
    agentKind : AgentKind;
    jobId : ?Nat;
    title : Text;
    body : Text;
    platform : ?Text;
    status : DraftStatus;
    compliancePassed : Bool;
    complianceNotes : Text;
    createdAt : Int;
    reviewedAt : ?Int;
    reviewedBy : ?Principal;
    sentAt : ?Int;
    metadata : Text;
  };

  public type SubscribeResult = { success : Bool; message : Text };

  // ── State ───────────────────────────────────────────────────────────────────

  transient let deployer = msg.caller;
  let adminState = Map.empty<Principal, Bool>();
  adminState.add(deployer, true);

  let agentState = Map.empty<Principal, Bool>();
  var backendCanisterId : Text = "";
  var nextAgentId : Nat = 1;
  var nextJobId : Nat = 1;
  var nextDraftId : Nat = 1;
  var nextAuditId : Nat = 1;

  let agents = Map.empty<Nat, AgentRecord>();
  let agentCanisterLinks = Map.empty<Nat, Principal>();
  let jobs = Map.empty<Nat, JobRecord>();
  let drafts = Map.empty<Nat, DraftRecord>();
  let subscribersByEmail = Map.empty<Text, SubscriberRecord>();
  let subscribersByConfirm = Map.empty<Text, Text>();
  let subscribersByUnsub = Map.empty<Text, Text>();
  // Confirmation-email send log (side map — SubscriberRecord has var fields and
  // is type-invariant in stable memory, so send tracking cannot live on it).
  // Keyed by the subscribersByEmail map key; value = sent-at timestamp.
  let confirmEmailsSent = Map.empty<Text, Int>();
  let secrets = Map.empty<Text, Text>();
  let newsletterArchive = Map.empty<Text, NewsletterIssue>();
  let auditLog = List.empty<AuditEntry>();

  transient var tickTimerId : ?Timer.TimerId = null;
  transient var subscribeAttempts = Map.empty<Text, Nat>();
  transient let TICK_INTERVAL_SEC : Nat = 3600;

  // ── Auth ────────────────────────────────────────────────────────────────────

  func requireAuthenticated(caller : Principal) {
    if (caller.isAnonymous()) Runtime.trap("anonymous caller not allowed");
  };

  func isAdmin(caller : Principal) : Bool {
    switch (adminState.get(caller)) { case (?true) true; case _ false };
  };

  func isAgent(caller : Principal) : Bool {
    switch (agentState.get(caller)) { case (?true) true; case _ false };
  };

  func requireAdmin(caller : Principal) {
    requireAuthenticated(caller);
    if (not isAdmin(caller)) Runtime.trap("admin only");
  };

  func requireAgent(caller : Principal) {
    requireAuthenticated(caller);
    if (not isAgent(caller)) Runtime.trap("agent only");
  };

  func requireAdminOrAgent(caller : Principal) {
    requireAuthenticated(caller);
    if (not (isAdmin(caller) or isAgent(caller))) {
      Runtime.trap("admin or agent only");
    };
  };

  func actorText(caller : Principal) : Text {
    Principal.toText(caller)
  };

  func appendAudit(caller : Principal, action : Text, detail : Text) {
    let entry : AuditEntry = {
      id = nextAuditId;
      at = Time.now();
      actorLabel = actorText(caller);
      action;
      detail;
    };
    nextAuditId += 1;
    auditLog.add(entry);
  };

  func appendSystemAudit(action : Text, detail : Text) {
    let entry : AuditEntry = {
      id = nextAuditId;
      at = Time.now();
      actorLabel = "system";
      action;
      detail;
    };
    nextAuditId += 1;
    auditLog.add(entry);
  };

  func kindToText(kind : AgentKind) : Text {
    switch (kind) {
      case (#orchestrator) "orchestrator";
      case (#newsletter) "newsletter";
      case (#email_correspondence) "email_correspondence";
      case (#social_x) "social_x";
      case (#social_instagram) "social_instagram";
      case (#social_tiktok) "social_tiktok";
      case (#social_facebook) "social_facebook";
      case (#social_youtube) "social_youtube";
      case (#compliance_reviewer) "compliance_reviewer";
      case (#fleet_cycles_ops) "fleet_cycles_ops";
      case (#weather_sentinel) "weather_sentinel";
      case (#weather_concierge) "weather_concierge";
      case (#nims_ops) "nims_ops";
      case (#orders_claims_ops) "orders_claims_ops";
      case (#community_moderator) "community_moderator";
      case (#analytics_digest) "analytics_digest";
      case (#ambassador_crumbeatr) "ambassador_crumbeatr";
      case (#ambassador_swop) "ambassador_swop";
      case (#ambassador_bonsai) "ambassador_bonsai";
    }
  };

  func agentToPublic(a : AgentRecord) : AgentPublic {
    {
      id = a.id;
      name = a.name;
      kind = a.kind;
      status = a.status;
      cadenceSeconds = a.cadenceSeconds;
      budgetDailyJobs = a.budgetDailyJobs;
      budgetDailyLlmCalls = a.budgetDailyLlmCalls;
      lastRunAt = a.lastRunAt;
      nextRunAt = a.nextRunAt;
      jobsToday = a.jobsToday;
      llmCallsToday = a.llmCallsToday;
    }
  };

  func jobToPublic(j : JobRecord) : JobPublic {
    {
      id = j.id;
      agentId = j.agentId;
      kind = j.kind;
      status = j.status;
      payload = j.payload;
      claimedBy = j.claimedBy;
      claimedAt = j.claimedAt;
      createdAt = j.createdAt;
      completedAt = j.completedAt;
      error = j.error;
    }
  };

  func draftToPublic(d : DraftRecord) : DraftPublic {
    {
      id = d.id;
      agentKind = d.agentKind;
      jobId = d.jobId;
      title = d.title;
      body = d.body;
      platform = d.platform;
      status = d.status;
      compliancePassed = d.compliancePassed;
      complianceNotes = d.complianceNotes;
      createdAt = d.createdAt;
      reviewedAt = d.reviewedAt;
      reviewedBy = d.reviewedBy;
      sentAt = d.sentAt;
      metadata = d.metadata;
    }
  };

  func normalizeEmail(email : Text) : Text {
    Text.trim(email, #char ' ')
  };

  func isValidEmail(email : Text) : Bool {
    Text.contains(email, #text "@") and email.size() >= 5 and email.size() <= 320
  };

  func randomToken(bytes : Nat) : async Text {
    let blob = await Random.blob();
    let slice = Blob.toArray(blob);
    var hex = "";
    var count : Nat = 0;
    for (b in slice.vals()) {
      if (count >= bytes) break;
      let hi = Nat8.toNat(b) / 16;
      let lo = Nat8.toNat(b) % 16;
      hex #= digitHex(hi) # digitHex(lo);
      count += 1;
    };
    hex
  };

  func digitHex(n : Nat) : Text {
    switch (n) {
      case 0 "0"; case 1 "1"; case 2 "2"; case 3 "3";
      case 4 "4"; case 5 "5"; case 6 "6"; case 7 "7";
      case 8 "8"; case 9 "9"; case 10 "a"; case 11 "b";
      case 12 "c"; case 13 "d"; case 14 "e"; case _ "f";
    }
  };

  func dayKeyNow() : Text {
    let secs = Int.abs(Time.now()) / 1_000_000_000;
    let days = secs / 86_400;
    Nat.toText(days)
  };

  func resetAgentBudgetIfNeeded(agent : AgentRecord) {
    let today = dayKeyNow();
    if (agent.dayKey != today) {
      agent.dayKey := today;
      agent.jobsToday := 0;
      agent.llmCallsToday := 0;
    };
  };

  func defaultCadence(kind : AgentKind) : Nat {
    switch (kind) {
      case (#orchestrator) 3600;
      case (#newsletter) 604_800;
      case (#email_correspondence) 86_400;
      case (#social_x) 86_400;
      case (#social_instagram) 86_400;
      case (#social_tiktok) 86_400;
      case (#social_facebook) 86_400;
      case (#social_youtube) 86_400;
      case (#compliance_reviewer) 3600;
      case (#fleet_cycles_ops) 21_600;
      case (#weather_sentinel) 21_600;
      case (#weather_concierge) 86_400;
      case (#nims_ops) 86_400;
      case (#orders_claims_ops) 21_600;
      case (#community_moderator) 86_400;
      case (#analytics_digest) 604_800;
      // Ambassadors engage a few times a day; posting itself is approval-gated.
      case (#ambassador_crumbeatr) 21_600;
      case (#ambassador_swop) 21_600;
      case (#ambassador_bonsai) 43_200;
    }
  };

  func defaultName(kind : AgentKind) : Text {
    switch (kind) {
      case (#orchestrator) "Orchestrator";
      case (#newsletter) "Newsletter";
      case (#email_correspondence) "Email Correspondence";
      case (#social_x) "Social — X";
      case (#social_instagram) "Social — Instagram";
      case (#social_tiktok) "Social — TikTok";
      case (#social_facebook) "Social — Facebook";
      case (#social_youtube) "Social — YouTube";
      case (#compliance_reviewer) "Compliance Reviewer";
      case (#fleet_cycles_ops) "Fleet & Cycles Ops";
      case (#weather_sentinel) "Weather Sentinel";
      case (#weather_concierge) "Weather Concierge";
      case (#nims_ops) "NIMS Ops";
      case (#orders_claims_ops) "Orders & Claims Ops";
      case (#community_moderator) "Community Moderator";
      case (#analytics_digest) "Analytics Digest";
      case (#ambassador_crumbeatr) "Captain Capsaicin — Crumbeatr";
      case (#ambassador_swop) "Captain Capsaicin — SWOP";
      case (#ambassador_bonsai) "Captain Capsaicin — Bonsai OS";
    }
  };

  func hasAgentKind(kind : AgentKind) : Bool {
    for ((_, a) in agents.entries()) {
      if (a.kind == kind) return true;
    };
    false
  };

  func addDefaultAgent(kind : AgentKind, now : Int) {
    let id = nextAgentId;
    nextAgentId += 1;
    let cadence = defaultCadence(kind);
    agents.add(
      id,
      {
        id = id;
        name = defaultName(kind);
        kind = kind;
        var status : AgentStatus = #active;
        var cadenceSeconds = cadence;
        var budgetDailyJobs = 24;
        var budgetDailyLlmCalls = 100;
        var lastRunAt : Int = 0;
        var nextRunAt : Int = now;
        var jobsToday = 0;
        var llmCallsToday = 0;
        var dayKey = dayKeyNow();
      },
    );
  };

  func seedDefaultAgents() {
    let kinds : [AgentKind] = [
      #orchestrator, #newsletter, #email_correspondence,
      #social_x, #social_instagram, #social_tiktok, #social_facebook, #social_youtube,
      #compliance_reviewer, #fleet_cycles_ops, #weather_sentinel, #weather_concierge, #nims_ops,
      #orders_claims_ops, #community_moderator, #analytics_digest,
      #ambassador_crumbeatr, #ambassador_swop, #ambassador_bonsai,
    ];
    let now = Time.now();
    if (agents.size() == 0) {
      for (kind in kinds.vals()) {
        addDefaultAgent(kind, now);
      };
      return;
    };
    for (kind in kinds.vals()) {
      if (not hasAgentKind(kind)) {
        addDefaultAgent(kind, now);
      };
    };
  };

  func enqueueJobForAgent(agent : AgentRecord, payload : Text) : ?Nat {
    resetAgentBudgetIfNeeded(agent);
    if (agent.status != #active) return null;
    if (agent.jobsToday >= agent.budgetDailyJobs) return null;
    let id = nextJobId;
    nextJobId += 1;
    jobs.add(
      id,
      {
        id = id;
        agentId = agent.id;
        kind = agent.kind;
        var status : JobStatus = #queued;
        payload = payload;
        var claimedBy : ?Principal = null;
        var claimedAt : ?Int = null;
        createdAt : Int = Time.now();
        var completedAt : ?Int = null;
        var error : ?Text = null;
      },
    );
    agent.jobsToday += 1;
    ?id
  };

  func runOrchestratorTick() {
    let now = Time.now();
    for ((_, agent) in agents.entries()) {
      resetAgentBudgetIfNeeded(agent);
      if (agent.status != #active) continue;
      if (now < agent.nextRunAt) continue;
      if (agent.kind == #orchestrator) {
        for ((_, other) in agents.entries()) {
          if (other.kind == #orchestrator) continue;
          resetAgentBudgetIfNeeded(other);
          if (other.status != #active) continue;
          if (now >= other.nextRunAt) {
            ignore enqueueJobForAgent(other, "{\"trigger\":\"orchestrator\"}");
            other.lastRunAt := now;
            other.nextRunAt := now + Int.abs(other.cadenceSeconds) * 1_000_000_000;
          };
        };
      } else {
        ignore enqueueJobForAgent(agent, "{\"trigger\":\"timer\"}");
        agent.lastRunAt := now;
        agent.nextRunAt := now + Int.abs(agent.cadenceSeconds) * 1_000_000_000;
      };
    };
  };

  func startTickTimer<system>() {
    switch (tickTimerId) {
      case (?id) Timer.cancelTimer(id);
      case null {};
    };
    tickTimerId := ?Timer.recurringTimer<system>(
      #seconds(TICK_INTERVAL_SEC),
      func () : async () {
        runOrchestratorTick();
      },
    );
  };

  seedDefaultAgents();
  startTickTimer<system>();

  system func preupgrade() {};
  system func postupgrade() {
    seedDefaultAgents();
    startTickTimer<system>();
  };

  // ── Admin: identity & config ────────────────────────────────────────────────

  public shared ({ caller }) func addAdmin(p : Principal) : async () {
    requireAdmin(caller);
    adminState.add(p, true);
  };

  public shared ({ caller }) func removeAdmin(p : Principal) : async () {
    requireAdmin(caller);
    if (adminState.size() <= 1) Runtime.trap("cannot remove last admin");
    ignore adminState.delete(p);
  };

  public query func listAdmins() : async [Principal] {
    let out = List.empty<Principal>();
    for ((p, _) in adminState.entries()) { out.add(p) };
    out.toArray()
  };

  type BackendAdminActor = actor {
    isPrincipalAdmin : shared query (Principal) -> async Bool;
  };

  func linkedBackendId() : Text {
    if (backendCanisterId != "") backendCanisterId else "ghxmp-xiaaa-aaaao-ba4sq-cai";
  };

  /// Register caller as agent_hub admin when they are a backend admin (one-time sync).
  public shared ({ caller }) func ensureAdminRegistration() : async Bool {
    requireAuthenticated(caller);
    if (isAdmin(caller)) return true;
    let backend = actor(linkedBackendId()) : BackendAdminActor;
    let ok = await backend.isPrincipalAdmin(caller);
    if (not ok) Runtime.trap("admin only");
    adminState.add(caller, true);
    appendAudit(caller, "ensureAdminRegistration", "synced from backend admin set");
    true
  };

  public shared ({ caller }) func addAgentPrincipal(p : Principal) : async () {
    requireAdmin(caller);
    agentState.add(p, true);
    appendAudit(caller, "addAgentPrincipal", Principal.toText(p));
  };

  public shared ({ caller }) func removeAgentPrincipal(p : Principal) : async () {
    requireAdmin(caller);
    ignore agentState.delete(p);
    appendAudit(caller, "removeAgentPrincipal", Principal.toText(p));
  };

  public query func listAgentPrincipals() : async [Principal] {
    let out = List.empty<Principal>();
    for ((p, _) in agentState.entries()) { out.add(p) };
    out.toArray()
  };

  public shared ({ caller }) func setBackendCanisterId(id : Text) : async () {
    requireAdmin(caller);
    backendCanisterId := id;
    appendAudit(caller, "setBackendCanisterId", id);
  };

  public query func getBackendCanisterId() : async Text {
    backendCanisterId
  };

  public query func getCycleBalance() : async Nat {
    Prim.cyclesBalance()
  };

  // ── Admin: agents & jobs ────────────────────────────────────────────────────

  public query func listAgents() : async [AgentPublic] {
    let out = List.empty<AgentPublic>();
    for ((_, a) in agents.entries()) { out.add(agentToPublic(a)) };
    out.toArray()
  };

  public query func listAgentCanisterLinks() : async [AgentCanisterLink] {
    let out = List.empty<AgentCanisterLink>();
    for ((agentId, canisterId) in agentCanisterLinks.entries()) {
      switch (agents.get(agentId)) {
        case (?a) {
          out.add({
            agentId;
            agentKind = a.kind;
            agentName = a.name;
            canisterId;
          });
        };
        case null {};
      };
    };
    out.toArray()
  };

  public shared ({ caller }) func adminAttachAgentCanister(
    agentId : Nat,
    canisterId : Principal,
  ) : async () {
    requireAdmin(caller);
    switch (agents.get(agentId)) {
      case null Runtime.trap("agent not found");
      case (?_) {};
    };
    agentCanisterLinks.add(agentId, canisterId);
    appendAudit(
      caller,
      "adminAttachAgentCanister",
      Nat.toText(agentId) # " -> " # Principal.toText(canisterId),
    );
  };

  public shared ({ caller }) func adminDetachAgentCanister(agentId : Nat) : async () {
    requireAdmin(caller);
    switch (agentCanisterLinks.get(agentId)) {
      case null Runtime.trap("no canister linked for agent");
      case (?canisterId) {
        ignore agentCanisterLinks.delete(agentId);
        appendAudit(
          caller,
          "adminDetachAgentCanister",
          Nat.toText(agentId) # " " # Principal.toText(canisterId),
        );
      };
    };
  };

  public shared ({ caller }) func setAgentStatus(agentId : Nat, status : AgentStatus) : async () {
    requireAdmin(caller);
    switch (agents.get(agentId)) {
      case null Runtime.trap("agent not found");
      case (?a) {
        a.status := status;
        appendAudit(caller, "setAgentStatus", Nat.toText(agentId) # " -> " # debug_show(status));
      };
    };
  };

  public shared ({ caller }) func setAgentBudgets(
    agentId : Nat,
    budgetDailyJobs : Nat,
    budgetDailyLlmCalls : Nat,
  ) : async () {
    requireAdmin(caller);
    switch (agents.get(agentId)) {
      case null Runtime.trap("agent not found");
      case (?a) {
        a.budgetDailyJobs := budgetDailyJobs;
        a.budgetDailyLlmCalls := budgetDailyLlmCalls;
        appendAudit(caller, "setAgentBudgets", Nat.toText(agentId));
      };
    };
  };

  public shared ({ caller }) func enqueueJob(agentId : Nat, payload : Text) : async Nat {
    requireAdmin(caller);
    switch (agents.get(agentId)) {
      case null Runtime.trap("agent not found");
      case (?a) {
        switch (enqueueJobForAgent(a, payload)) {
          case null Runtime.trap("could not enqueue job");
          case (?id) {
            appendAudit(caller, "enqueueJob", Nat.toText(id));
            id
          };
        };
      };
    };
  };

  public query func listJobs(limit : Nat, statusFilter : ?JobStatus) : async [JobPublic] {
    let out = List.empty<JobPublic>();
    var count : Nat = 0;
    label scan for ((_, j) in jobs.entries()) {
      switch (statusFilter) {
        case (?s) if (j.status != s) { continue scan };
        case null {};
      };
      out.add(jobToPublic(j));
      count += 1;
      if (count >= limit) break scan;
    };
    out.toArray()
  };

  // ── Worker: claim & report ──────────────────────────────────────────────────

  public shared ({ caller }) func claimJobs(limit : Nat) : async [JobPublic] {
    requireAgent(caller);
    let out = List.empty<JobPublic>();
    var claimed : Nat = 0;
    let now = Time.now();
    label scan for ((id, j) in jobs.entries()) {
      if (j.status != #queued) continue scan;
      j.status := #claimed;
      j.claimedBy := ?caller;
      j.claimedAt := ?now;
      out.add(jobToPublic(j));
      claimed += 1;
      if (claimed >= limit) break scan;
    };
    out.toArray()
  };

  public shared ({ caller }) func reportJobComplete(
    jobId : Nat,
    success : Bool,
    errorMsg : ?Text,
  ) : async () {
    requireAgent(caller);
    switch (jobs.get(jobId)) {
      case null Runtime.trap("job not found");
      case (?j) {
        j.status := if (success) #done else #failed;
        j.completedAt := ?Time.now();
        j.error := errorMsg;
        appendAudit(caller, "reportJobComplete", Nat.toText(jobId));
      };
    };
  };

  public shared ({ caller }) func reportRun(kind : AgentKind, summary : Text) : async () {
    requireAgent(caller);
    for ((_, a) in agents.entries()) {
      if (a.kind == kind) {
        a.lastRunAt := Time.now();
      };
    };
    appendAudit(caller, "reportRun", kindToText(kind) # ": " # summary);
  };

  public shared ({ caller }) func recordLlmCall(agentId : Nat) : async Bool {
    requireAgent(caller);
    switch (agents.get(agentId)) {
      case null false;
      case (?a) {
        resetAgentBudgetIfNeeded(a);
        if (a.llmCallsToday >= a.budgetDailyLlmCalls) false else {
          a.llmCallsToday += 1;
          true
        }
      };
    };
  };

  // ── Drafts ──────────────────────────────────────────────────────────────────

  public shared ({ caller }) func submitDraft(
    agentKind : AgentKind,
    jobId : ?Nat,
    title : Text,
    body : Text,
    platform : ?Text,
    compliancePassed : Bool,
    complianceNotes : Text,
    metadata : Text,
  ) : async Nat {
    requireAgent(caller);
    let id = nextDraftId;
    nextDraftId += 1;
    drafts.add(
      id,
      {
        id = id;
        agentKind = agentKind;
        jobId = jobId;
        var title = title;
        var body = body;
        platform = platform;
        var status : DraftStatus = #pending;
        var compliancePassed = compliancePassed;
        var complianceNotes = complianceNotes;
        createdAt : Int = Time.now();
        var reviewedAt : ?Int = null;
        var reviewedBy : ?Principal = null;
        var sentAt : ?Int = null;
        metadata = metadata;
      },
    );
    appendAudit(caller, "submitDraft", Nat.toText(id) # " " # kindToText(agentKind));
    id
  };

  public query func listDrafts(
    limit : Nat,
    statusFilter : ?DraftStatus,
  ) : async [DraftPublic] {
    let out = List.empty<DraftPublic>();
    var count : Nat = 0;
    label scan for ((_, d) in drafts.entries()) {
      switch (statusFilter) {
        case (?s) if (d.status != s) { continue scan };
        case null {};
      };
      out.add(draftToPublic(d));
      count += 1;
      if (count >= limit) break scan;
    };
    out.toArray()
  };

  public shared ({ caller }) func approveDraft(draftId : Nat) : async () {
    requireAdmin(caller);
    switch (drafts.get(draftId)) {
      case null Runtime.trap("draft not found");
      case (?d) {
        d.status := #approved;
        d.reviewedAt := ?Time.now();
        d.reviewedBy := ?caller;
        appendAudit(caller, "approveDraft", Nat.toText(draftId));
      };
    };
  };

  public shared ({ caller }) func rejectDraft(draftId : Nat, reason : Text) : async () {
    requireAdmin(caller);
    switch (drafts.get(draftId)) {
      case null Runtime.trap("draft not found");
      case (?d) {
        d.status := #rejected;
        d.reviewedAt := ?Time.now();
        d.reviewedBy := ?caller;
        d.complianceNotes := reason;
        appendAudit(caller, "rejectDraft", Nat.toText(draftId) # ": " # reason);
      };
    };
  };

  /// Admin: reject every pending draft in one call. Returns how many were rejected.
  /// One summary audit line (not one per draft) to keep the log readable during backlog clears.
  public shared ({ caller }) func rejectAllPendingDrafts(reason : Text) : async Nat {
    requireAdmin(caller);
    let note = if (reason == "") { "bulk reject" } else { reason };
    let now = Time.now();
    var n : Nat = 0;
    for ((_, d) in drafts.entries()) {
      if (d.status == #pending) {
        d.status := #rejected;
        d.reviewedAt := ?now;
        d.reviewedBy := ?caller;
        d.complianceNotes := note;
        n += 1;
      };
    };
    appendAudit(caller, "rejectAllPendingDrafts", Nat.toText(n) # ": " # note);
    n
  };

  /// True pending backlog size (not capped like listDrafts limit).
  public query func countPendingDrafts() : async Nat {
    var n : Nat = 0;
    for ((_, d) in drafts.entries()) {
      if (d.status == #pending) { n += 1 };
    };
    n
  };

  public shared ({ caller }) func editDraft(
    draftId : Nat,
    title : Text,
    body : Text,
  ) : async () {
    requireAdmin(caller);
    switch (drafts.get(draftId)) {
      case null Runtime.trap("draft not found");
      case (?d) {
        d.title := title;
        d.body := body;
        appendAudit(caller, "editDraft", Nat.toText(draftId));
      };
    };
  };

  public shared ({ caller }) func markDraftSent(draftId : Nat) : async () {
    requireAdminOrAgent(caller);
    switch (drafts.get(draftId)) {
      case null Runtime.trap("draft not found");
      case (?d) {
        d.status := #sent;
        d.sentAt := ?Time.now();
        appendAudit(caller, "markDraftSent", Nat.toText(draftId));
      };
    };
  };

  public query func getApprovedDraftsForSend(limit : Nat) : async [DraftPublic] {
    let out = List.empty<DraftPublic>();
    var count : Nat = 0;
    label scan for ((_, d) in drafts.entries()) {
      if (d.status != #approved) continue scan;
      out.add(draftToPublic(d));
      count += 1;
      if (count >= limit) break scan;
    };
    out.toArray()
  };

  // ── Newsletter subscribers ────────────────────────────────────────────────────

  public shared func subscribeNewsletter(email : Text) : async SubscribeResult {
    let normalized = normalizeEmail(email);
    if (not isValidEmail(normalized)) {
      return { success = false; message = "Invalid email address" };
    };
    switch (subscribeAttempts.get(normalized)) {
      case (?n) if (n >= 5) {
        return { success = false; message = "Too many attempts. Try again later." };
      };
      case (?n) { subscribeAttempts.add(normalized, n + 1) };
      case null { subscribeAttempts.add(normalized, 1) };
    };
    switch (subscribersByEmail.get(normalized)) {
      case (?existing) {
        switch (existing.status) {
          case (#confirmed) {
            return { success = true; message = "Already subscribed." };
          };
          case (#pending) {
            return { success = true; message = "Confirmation email pending." };
          };
          case (#unsubscribed) {};
        };
      };
      case null {};
    };
    let confirmToken = await randomToken(16);
    let unsubToken = await randomToken(16);
    let record : SubscriberRecord = {
      email = normalized;
      confirmToken;
      unsubscribeToken = unsubToken;
      var status = #pending;
      subscribedAt = Time.now();
      var confirmedAt = null;
    };
    subscribersByEmail.add(normalized, record);
    subscribersByConfirm.add(confirmToken, normalized);
    subscribersByUnsub.add(unsubToken, normalized);
    appendSystemAudit("subscribeNewsletter", normalized);
    { success = true; message = "Check your email to confirm subscription." }
  };

  public shared func confirmSubscription(token : Text) : async SubscribeResult {
    switch (subscribersByConfirm.get(token)) {
      case null {
        { success = false; message = "Invalid or expired confirmation link." }
      };
      case (?email) {
        switch (subscribersByEmail.get(email)) {
          case null {
            { success = false; message = "Subscriber not found." }
          };
          case (?s) {
            s.status := #confirmed;
            s.confirmedAt := ?Time.now();
            appendSystemAudit("confirmSubscription", email);
            { success = true; message = "Subscription confirmed. Welcome to IC SPICY." }
          };
        };
      };
    }
  };

  public shared func unsubscribe(token : Text) : async SubscribeResult {
    switch (subscribersByUnsub.get(token)) {
      case null {
        { success = false; message = "Invalid unsubscribe link." }
      };
      case (?email) {
        switch (subscribersByEmail.get(email)) {
          case null {
            { success = false; message = "Subscriber not found." }
          };
          case (?s) {
            s.status := #unsubscribed;
            appendSystemAudit("unsubscribe", email);
            { success = true; message = "You have been unsubscribed." }
          };
        };
      };
    }
  };

  public query ({ caller }) func listSubscribers(limit : Nat) : async [SubscriberPublic] {
    requireAdmin(caller);
    let out = List.empty<SubscriberPublic>();
    var count : Nat = 0;
    label scan for ((_, s) in subscribersByEmail.entries()) {
      out.add({
        email = s.email;
        status = s.status;
        subscribedAt = s.subscribedAt;
        confirmedAt = s.confirmedAt;
      });
      count += 1;
      if (count >= limit) break scan;
    };
    out.toArray()
  };

  public query ({ caller }) func listConfirmedSubscriberEmails(limit : Nat) : async [Text] {
    requireAdminOrAgent(caller); // privacy: subscriber emails must not be publicly enumerable
    let out = List.empty<Text>();
    var count : Nat = 0;
    label scan for ((_, s) in subscribersByEmail.entries()) {
      if (s.status != #confirmed) continue scan;
      out.add(s.email);
      count += 1;
      if (count >= limit) break scan;
    };
    out.toArray()
  };

  /// Agent/admin: pending subscribers who still need their confirmation email,
  /// as (emailKey, confirmToken) pairs. Excludes anyone already sent one.
  public query ({ caller }) func listPendingConfirmSends(limit : Nat) : async [(Text, Text)] {
    requireAdminOrAgent(caller);
    let out = List.empty<(Text, Text)>();
    var count : Nat = 0;
    label scan for ((emailKey, s) in subscribersByEmail.entries()) {
      if (s.status != #pending) continue scan;
      if (confirmEmailsSent.get(emailKey) != null) continue scan;
      out.add((emailKey, s.confirmToken));
      count += 1;
      if (count >= limit) break scan;
    };
    out.toArray()
  };

  /// Agent/admin: record that the confirmation email went out so the worker
  /// does not re-send it on every poll.
  public shared ({ caller }) func markConfirmationSent(emailKey : Text) : async () {
    requireAdminOrAgent(caller);
    confirmEmailsSent.add(emailKey, Time.now());
    appendAudit(caller, "confirmationEmailSent", emailKey);
  };

  /// Agent/admin: confirmed subscribers as (email, unsubscribeToken) pairs so the
  /// worker can personalize the CAN-SPAM unsubscribe link at send time.
  public query ({ caller }) func listConfirmedSubscribersForSend(limit : Nat) : async [(Text, Text)] {
    requireAdminOrAgent(caller);
    let out = List.empty<(Text, Text)>();
    var count : Nat = 0;
    label scan for ((_, s) in subscribersByEmail.entries()) {
      if (s.status != #confirmed) continue scan;
      out.add((s.email, s.unsubscribeToken));
      count += 1;
      if (count >= limit) break scan;
    };
    out.toArray()
  };

  // ── Newsletter archive ──────────────────────────────────────────────────────

  public shared ({ caller }) func archiveNewsletterIssue(
    weekKey : Text,
    subject : Text,
    htmlBody : Text,
    draftId : Nat,
    recipientCount : Nat,
  ) : async () {
    requireAdminOrAgent(caller);
    newsletterArchive.add(
      weekKey,
      {
        weekKey;
        subject;
        htmlBody;
        draftId;
        sentAt = Time.now();
        recipientCount;
      },
    );
    appendAudit(caller, "archiveNewsletterIssue", weekKey);
  };

  public query func getNewsletterIssue(weekKey : Text) : async ?NewsletterIssue {
    newsletterArchive.get(weekKey)
  };

  public query func listNewsletterIssues(limit : Nat) : async [NewsletterIssue] {
    let out = List.empty<NewsletterIssue>();
    var count : Nat = 0;
    label scan for ((_, issue) in newsletterArchive.entries()) {
      out.add(issue);
      count += 1;
      if (count >= limit) break scan;
    };
    out.toArray()
  };

  // ── Secrets (admin-set, agent-read whitelisted keys) ────────────────────────

  public shared ({ caller }) func setSecret(name : Text, value : Text) : async () {
    requireAdmin(caller);
    secrets.add(name, value);
    appendAudit(caller, "setSecret", name);
  };

  public query ({ caller }) func listSecretNames() : async [Text] {
    requireAdmin(caller);
    let out = List.empty<Text>();
    for ((name, _) in secrets.entries()) { out.add(name) };
    out.toArray()
  };

  public shared ({ caller }) func getSecrets(names : [Text]) : async [(Text, Text)] {
    requireAdminOrAgent(caller);
    let allowed = [
      "resend_api_key", "resend_from_email", "llm_api_key", "llm_provider",
      "llm_model", "admin_alert_email", "backend_canister_id",
      "spicy_ai_canister_id", "newsletter_reply_to",
      // Per-task LLM routing (worker router)
      "llm_api_key_anthropic", "llm_api_key_openai",
      "llm_route_default", "llm_route_social", "llm_route_newsletter",
      "llm_route_almanac", "llm_route_sentinel", "llm_route_analytics",
      "llm_route_compliance", "llm_route_email",
      // Captain Capsaicin cross-dapp ambassador
      "llm_route_ambassador", "ambassador_sweep_principal",
      "crumbeatr_canister_id", "swop_backend_canister_id",
      "bonsai_registry_canister_id", "bonsai_orbit_canister_id",
      "bonsai_bazaar_canister_id",
      // Canopy wallet principal for Capsaicin on BonsaiOS (CRM / mint / trade)
      "canopy_wallet_principal",
    ];
    let out = List.empty<(Text, Text)>();
    for (name in names.vals()) {
      var ok = false;
      for (a in allowed.vals()) {
        if (a == name) { ok := true };
      };
      if (ok) {
        switch (secrets.get(name)) {
          case (?v) out.add((name, v));
          case null {};
        };
      };
    };
    out.toArray()
  };

  // ── Audit log ───────────────────────────────────────────────────────────────

  public query ({ caller }) func getAuditLog(offset : Nat, limit : Nat) : async [AuditEntry] {
    requireAdmin(caller);
    let arr = auditLog.toArray();
    if (offset >= arr.size()) return [];
    let end = if (offset + limit >= arr.size()) arr.size() else offset + limit;
    Array.tabulate<AuditEntry>(
      end - offset,
      func (i : Nat) : AuditEntry { arr[offset + i] },
    )
  };

  public query ({ caller }) func getAuditLogEntries(limit : Nat) : async [AuditEntry] {
    requireAdmin(caller);
    let arr = auditLog.toArray();
    let len = arr.size();
    if (len <= limit) arr else {
      Array.tabulate<AuditEntry>(
        limit,
        func (i : Nat) : AuditEntry { arr[len - limit + i] },
      )
    }
  };
};

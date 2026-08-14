// migrations/PhaseAgentHubWeatherConcierge.mo
// One-time upgrade: add #weather_concierge to AgentKind in persisted job/agent/draft maps.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {
  type OldAgentKind = {
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
    #nims_ops;
    #orders_claims_ops;
    #community_moderator;
    #analytics_digest;
  };

  type NewAgentKind = {
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
  };

  type AgentStatus = { #active; #paused; #disabled };
  type JobStatus = { #queued; #claimed; #done; #failed };
  type DraftStatus = { #pending; #approved; #rejected; #sent };

  type OldAgentRecord = {
    id : Nat;
    name : Text;
    kind : OldAgentKind;
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

  type NewAgentRecord = {
    id : Nat;
    name : Text;
    kind : NewAgentKind;
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

  type OldJobRecord = {
    id : Nat;
    agentId : Nat;
    kind : OldAgentKind;
    var status : JobStatus;
    payload : Text;
    var claimedBy : ?Principal;
    var claimedAt : ?Int;
    createdAt : Int;
    var completedAt : ?Int;
    var error : ?Text;
  };

  type NewJobRecord = {
    id : Nat;
    agentId : Nat;
    kind : NewAgentKind;
    var status : JobStatus;
    payload : Text;
    var claimedBy : ?Principal;
    var claimedAt : ?Int;
    createdAt : Int;
    var completedAt : ?Int;
    var error : ?Text;
  };

  type OldDraftRecord = {
    id : Nat;
    agentKind : OldAgentKind;
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

  type NewDraftRecord = {
    id : Nat;
    agentKind : NewAgentKind;
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

  func migrateKind(k : OldAgentKind) : NewAgentKind {
    switch (k) {
      case (#orchestrator) #orchestrator;
      case (#newsletter) #newsletter;
      case (#email_correspondence) #email_correspondence;
      case (#social_x) #social_x;
      case (#social_instagram) #social_instagram;
      case (#social_tiktok) #social_tiktok;
      case (#social_facebook) #social_facebook;
      case (#social_youtube) #social_youtube;
      case (#compliance_reviewer) #compliance_reviewer;
      case (#fleet_cycles_ops) #fleet_cycles_ops;
      case (#weather_sentinel) #weather_sentinel;
      case (#nims_ops) #nims_ops;
      case (#orders_claims_ops) #orders_claims_ops;
      case (#community_moderator) #community_moderator;
      case (#analytics_digest) #analytics_digest;
    }
  };

  func migrateAgent(a : OldAgentRecord) : NewAgentRecord {
    {
      id = a.id;
      name = a.name;
      kind = migrateKind(a.kind);
      var status = a.status;
      var cadenceSeconds = a.cadenceSeconds;
      var budgetDailyJobs = a.budgetDailyJobs;
      var budgetDailyLlmCalls = a.budgetDailyLlmCalls;
      var lastRunAt = a.lastRunAt;
      var nextRunAt = a.nextRunAt;
      var jobsToday = a.jobsToday;
      var llmCallsToday = a.llmCallsToday;
      var dayKey = a.dayKey;
    }
  };

  func migrateJob(j : OldJobRecord) : NewJobRecord {
    {
      id = j.id;
      agentId = j.agentId;
      kind = migrateKind(j.kind);
      var status = j.status;
      payload = j.payload;
      var claimedBy = j.claimedBy;
      var claimedAt = j.claimedAt;
      createdAt = j.createdAt;
      var completedAt = j.completedAt;
      var error = j.error;
    }
  };

  func migrateDraft(d : OldDraftRecord) : NewDraftRecord {
    {
      id = d.id;
      agentKind = migrateKind(d.agentKind);
      jobId = d.jobId;
      var title = d.title;
      var body = d.body;
      platform = d.platform;
      var status = d.status;
      var compliancePassed = d.compliancePassed;
      var complianceNotes = d.complianceNotes;
      createdAt = d.createdAt;
      var reviewedAt = d.reviewedAt;
      var reviewedBy = d.reviewedBy;
      var sentAt = d.sentAt;
      metadata = d.metadata;
    }
  };

  func migrateAgentsMap(
    old : Map.Map<Nat, OldAgentRecord>,
  ) : Map.Map<Nat, NewAgentRecord> {
    let next = Map.empty<Nat, NewAgentRecord>();
    for ((id, a) in old.entries()) {
      Map.add(next, Nat.compare, id, migrateAgent(a));
    };
    next
  };

  func migrateJobsMap(
    old : Map.Map<Nat, OldJobRecord>,
  ) : Map.Map<Nat, NewJobRecord> {
    let next = Map.empty<Nat, NewJobRecord>();
    for ((id, j) in old.entries()) {
      Map.add(next, Nat.compare, id, migrateJob(j));
    };
    next
  };

  func migrateDraftsMap(
    old : Map.Map<Nat, OldDraftRecord>,
  ) : Map.Map<Nat, NewDraftRecord> {
    let next = Map.empty<Nat, NewDraftRecord>();
    for ((id, d) in old.entries()) {
      Map.add(next, Nat.compare, id, migrateDraft(d));
    };
    next
  };

  public func migration(
    old : {
      agents : Map.Map<Nat, OldAgentRecord>;
      jobs : Map.Map<Nat, OldJobRecord>;
      drafts : Map.Map<Nat, OldDraftRecord>;
    },
  ) : {
    agents : Map.Map<Nat, NewAgentRecord>;
    jobs : Map.Map<Nat, NewJobRecord>;
    drafts : Map.Map<Nat, NewDraftRecord>;
  } {
    {
      agents = migrateAgentsMap(old.agents);
      jobs = migrateJobsMap(old.jobs);
      drafts = migrateDraftsMap(old.drafts);
    }
  };
};

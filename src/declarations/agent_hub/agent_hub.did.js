export const idlFactory = ({ IDL }) => {
  const JobStatus = IDL.Variant({
    'done' : IDL.Null,
    'claimed' : IDL.Null,
    'queued' : IDL.Null,
    'failed' : IDL.Null,
  });
  const AgentKind = IDL.Variant({
    'social_x' : IDL.Null,
    'orders_claims_ops' : IDL.Null,
    'community_moderator' : IDL.Null,
    'social_facebook' : IDL.Null,
    'social_tiktok' : IDL.Null,
    'email_correspondence' : IDL.Null,
    'weather_sentinel' : IDL.Null,
    'analytics_digest' : IDL.Null,
    'orchestrator' : IDL.Null,
    'nims_ops' : IDL.Null,
    'weather_concierge' : IDL.Null,
    'fleet_cycles_ops' : IDL.Null,
    'newsletter' : IDL.Null,
    'social_youtube' : IDL.Null,
    'social_instagram' : IDL.Null,
    'compliance_reviewer' : IDL.Null,
  });
  const JobPublic = IDL.Record({
    'id' : IDL.Nat,
    'status' : JobStatus,
    'completedAt' : IDL.Opt(IDL.Int),
    'kind' : AgentKind,
    'createdAt' : IDL.Int,
    'agentId' : IDL.Nat,
    'error' : IDL.Opt(IDL.Text),
    'claimedAt' : IDL.Opt(IDL.Int),
    'claimedBy' : IDL.Opt(IDL.Principal),
    'payload' : IDL.Text,
  });
  const SubscribeResult = IDL.Record({
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const DraftStatus = IDL.Variant({
    'pending' : IDL.Null,
    'sent' : IDL.Null,
    'approved' : IDL.Null,
    'rejected' : IDL.Null,
  });
  const DraftPublic = IDL.Record({
    'id' : IDL.Nat,
    'status' : DraftStatus,
    'title' : IDL.Text,
    'metadata' : IDL.Text,
    'body' : IDL.Text,
    'createdAt' : IDL.Int,
    'agentKind' : AgentKind,
    'jobId' : IDL.Opt(IDL.Nat),
    'platform' : IDL.Opt(IDL.Text),
    'sentAt' : IDL.Opt(IDL.Int),
    'reviewedAt' : IDL.Opt(IDL.Int),
    'reviewedBy' : IDL.Opt(IDL.Principal),
    'compliancePassed' : IDL.Bool,
    'complianceNotes' : IDL.Text,
  });
  const AuditEntry = IDL.Record({
    'at' : IDL.Int,
    'id' : IDL.Nat,
    'action' : IDL.Text,
    'detail' : IDL.Text,
    'actorLabel' : IDL.Text,
  });
  const NewsletterIssue = IDL.Record({
    'htmlBody' : IDL.Text,
    'weekKey' : IDL.Text,
    'subject' : IDL.Text,
    'sentAt' : IDL.Int,
    'recipientCount' : IDL.Nat,
    'draftId' : IDL.Nat,
  });
  const AgentCanisterLink = IDL.Record({
    'agentKind' : AgentKind,
    'agentName' : IDL.Text,
    'agentId' : IDL.Nat,
    'canisterId' : IDL.Principal,
  });
  const AgentStatus = IDL.Variant({
    'active' : IDL.Null,
    'disabled' : IDL.Null,
    'paused' : IDL.Null,
  });
  const AgentPublic = IDL.Record({
    'id' : IDL.Nat,
    'status' : AgentStatus,
    'cadenceSeconds' : IDL.Nat,
    'lastRunAt' : IDL.Int,
    'kind' : AgentKind,
    'name' : IDL.Text,
    'budgetDailyJobs' : IDL.Nat,
    'llmCallsToday' : IDL.Nat,
    'nextRunAt' : IDL.Int,
    'budgetDailyLlmCalls' : IDL.Nat,
    'jobsToday' : IDL.Nat,
  });
  const SubscriberStatus = IDL.Variant({
    'pending' : IDL.Null,
    'unsubscribed' : IDL.Null,
    'confirmed' : IDL.Null,
  });
  const SubscriberPublic = IDL.Record({
    'status' : SubscriberStatus,
    'subscribedAt' : IDL.Int,
    'confirmedAt' : IDL.Opt(IDL.Int),
    'email' : IDL.Text,
  });
  const AgentHub = IDL.Service({
    'addAdmin' : IDL.Func([IDL.Principal], [], []),
    'addAgentPrincipal' : IDL.Func([IDL.Principal], [], []),
    'adminAttachAgentCanister' : IDL.Func([IDL.Nat, IDL.Principal], [], []),
    'adminDetachAgentCanister' : IDL.Func([IDL.Nat], [], []),
    'approveDraft' : IDL.Func([IDL.Nat], [], []),
    'archiveNewsletterIssue' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Nat, IDL.Nat],
        [],
        [],
      ),
    'claimJobs' : IDL.Func([IDL.Nat], [IDL.Vec(JobPublic)], []),
    'confirmSubscription' : IDL.Func([IDL.Text], [SubscribeResult], []),
    'countPendingDrafts' : IDL.Func([], [IDL.Nat], ['query']),
    'editDraft' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text], [], []),
    'enqueueJob' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Nat], []),
    'ensureAdminRegistration' : IDL.Func([], [IDL.Bool], []),
    'getApprovedDraftsForSend' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(DraftPublic)],
        ['query'],
      ),
    'getAuditLog' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(AuditEntry)],
        ['query'],
      ),
    'getAuditLogEntries' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(AuditEntry)],
        ['query'],
      ),
    'getBackendCanisterId' : IDL.Func([], [IDL.Text], ['query']),
    'getCycleBalance' : IDL.Func([], [IDL.Nat], ['query']),
    'getNewsletterIssue' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(NewsletterIssue)],
        ['query'],
      ),
    'getSecrets' : IDL.Func(
        [IDL.Vec(IDL.Text)],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [],
      ),
    'listAdmins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listAgentCanisterLinks' : IDL.Func(
        [],
        [IDL.Vec(AgentCanisterLink)],
        ['query'],
      ),
    'listAgentPrincipals' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listAgents' : IDL.Func([], [IDL.Vec(AgentPublic)], ['query']),
    'listConfirmedSubscriberEmails' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Text)],
        ['query'],
      ),
    'listConfirmedSubscribersForSend' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        ['query'],
      ),
    'listDrafts' : IDL.Func(
        [IDL.Nat, IDL.Opt(DraftStatus)],
        [IDL.Vec(DraftPublic)],
        ['query'],
      ),
    'listJobs' : IDL.Func(
        [IDL.Nat, IDL.Opt(JobStatus)],
        [IDL.Vec(JobPublic)],
        ['query'],
      ),
    'listNewsletterIssues' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(NewsletterIssue)],
        ['query'],
      ),
    'listSecretNames' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'listSubscribers' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(SubscriberPublic)],
        ['query'],
      ),
    'markDraftSent' : IDL.Func([IDL.Nat], [], []),
    'recordLlmCall' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'rejectAllPendingDrafts' : IDL.Func([IDL.Text], [IDL.Nat], []),
    'rejectDraft' : IDL.Func([IDL.Nat, IDL.Text], [], []),
    'removeAdmin' : IDL.Func([IDL.Principal], [], []),
    'removeAgentPrincipal' : IDL.Func([IDL.Principal], [], []),
    'reportJobComplete' : IDL.Func(
        [IDL.Nat, IDL.Bool, IDL.Opt(IDL.Text)],
        [],
        [],
      ),
    'reportRun' : IDL.Func([AgentKind, IDL.Text], [], []),
    'setAgentBudgets' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat], [], []),
    'setAgentStatus' : IDL.Func([IDL.Nat, AgentStatus], [], []),
    'setBackendCanisterId' : IDL.Func([IDL.Text], [], []),
    'setSecret' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'submitDraft' : IDL.Func(
        [
          AgentKind,
          IDL.Opt(IDL.Nat),
          IDL.Text,
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Bool,
          IDL.Text,
          IDL.Text,
        ],
        [IDL.Nat],
        [],
      ),
    'subscribeNewsletter' : IDL.Func([IDL.Text], [SubscribeResult], []),
    'unsubscribe' : IDL.Func([IDL.Text], [SubscribeResult], []),
  });
  return AgentHub;
};
export const init = ({ IDL }) => { return []; };

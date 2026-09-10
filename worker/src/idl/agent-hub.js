export function agentHubIdlFactory({ IDL }) {
  const AgentKind = IDL.Variant({
    orchestrator: IDL.Null,
    newsletter: IDL.Null,
    email_correspondence: IDL.Null,
    social_x: IDL.Null,
    social_instagram: IDL.Null,
    social_tiktok: IDL.Null,
    social_facebook: IDL.Null,
    social_youtube: IDL.Null,
    compliance_reviewer: IDL.Null,
    fleet_cycles_ops: IDL.Null,
    weather_sentinel: IDL.Null,
    weather_concierge: IDL.Null,
    nims_ops: IDL.Null,
    orders_claims_ops: IDL.Null,
    community_moderator: IDL.Null,
    analytics_digest: IDL.Null,
  });
  const JobStatus = IDL.Variant({
    queued: IDL.Null,
    claimed: IDL.Null,
    done: IDL.Null,
    failed: IDL.Null,
  });
  const DraftStatus = IDL.Variant({
    pending: IDL.Null,
    approved: IDL.Null,
    rejected: IDL.Null,
    sent: IDL.Null,
  });
  const JobPublic = IDL.Record({
    id: IDL.Nat,
    agentId: IDL.Nat,
    kind: AgentKind,
    status: JobStatus,
    payload: IDL.Text,
    claimedBy: IDL.Opt(IDL.Principal),
    claimedAt: IDL.Opt(IDL.Int),
    createdAt: IDL.Int,
    completedAt: IDL.Opt(IDL.Int),
    error: IDL.Opt(IDL.Text),
  });
  const DraftPublic = IDL.Record({
    id: IDL.Nat,
    agentKind: AgentKind,
    jobId: IDL.Opt(IDL.Nat),
    title: IDL.Text,
    body: IDL.Text,
    platform: IDL.Opt(IDL.Text),
    status: DraftStatus,
    compliancePassed: IDL.Bool,
    complianceNotes: IDL.Text,
    createdAt: IDL.Int,
    reviewedAt: IDL.Opt(IDL.Int),
    reviewedBy: IDL.Opt(IDL.Principal),
    sentAt: IDL.Opt(IDL.Int),
    metadata: IDL.Text,
  });

  return IDL.Service({
    claimJobs: IDL.Func([IDL.Nat], [IDL.Vec(JobPublic)], []),
    reportJobComplete: IDL.Func(
      [IDL.Nat, IDL.Bool, IDL.Opt(IDL.Text)],
      [],
      [],
    ),
    reportRun: IDL.Func([AgentKind, IDL.Text], [], []),
    recordLlmCall: IDL.Func([IDL.Nat], [IDL.Bool], []),
    submitDraft: IDL.Func(
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
    getSecrets: IDL.Func(
      [IDL.Vec(IDL.Text)],
      [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
      [],
    ),
    getApprovedDraftsForSend: IDL.Func([IDL.Nat], [IDL.Vec(DraftPublic)], ["query"]),
    markDraftSent: IDL.Func([IDL.Nat], [], []),
    archiveNewsletterIssue: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Nat, IDL.Nat],
      [],
      [],
    ),
    listConfirmedSubscriberEmails: IDL.Func([IDL.Nat], [IDL.Vec(IDL.Text)], ["query"]),
    listConfirmedSubscribersForSend: IDL.Func(
      [IDL.Nat],
      [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
      ["query"],
    ),
    listPendingConfirmSends: IDL.Func(
      [IDL.Nat],
      [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
      ["query"],
    ),
    markConfirmationSent: IDL.Func([IDL.Text], [], []),
    listAgents: IDL.Func([], [IDL.Vec(IDL.Record({
      id: IDL.Nat,
      name: IDL.Text,
      kind: AgentKind,
      status: IDL.Variant({ active: IDL.Null, paused: IDL.Null, disabled: IDL.Null }),
      cadenceSeconds: IDL.Nat,
      budgetDailyJobs: IDL.Nat,
      budgetDailyLlmCalls: IDL.Nat,
      lastRunAt: IDL.Int,
      nextRunAt: IDL.Int,
      jobsToday: IDL.Nat,
      llmCallsToday: IDL.Nat,
    }))], ["query"]),
  });
}

export function kindKey(kind) {
  return Object.keys(kind)[0] ?? "unknown";
}

export function kindVariant(key) {
  return { [key]: null };
}

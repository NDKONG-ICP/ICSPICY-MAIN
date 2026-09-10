import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import type { IDL } from "@dfinity/candid";
import type { Principal } from "@dfinity/principal";

export const AGENT_HUB_CANISTER_ID =
  (process.env.CANISTER_ID_AGENT_HUB ?? "").trim() ||
  (typeof window !== "undefined"
    ? (
        (window as unknown as { __AGENT_HUB_CANISTER_ID__?: string })
          .__AGENT_HUB_CANISTER_ID__ ?? ""
      ).trim()
    : "") ||
  "swzzi-lyaaa-aaaao-bbfha-cai";

export const agentHubIdlFactory: IDL.InterfaceFactory = ({ IDL }) => {
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
  const AgentStatus = IDL.Variant({
    active: IDL.Null,
    paused: IDL.Null,
    disabled: IDL.Null,
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
  const SubscriberStatus = IDL.Variant({
    pending: IDL.Null,
    confirmed: IDL.Null,
    unsubscribed: IDL.Null,
  });

  const AgentPublic = IDL.Record({
    id: IDL.Nat,
    name: IDL.Text,
    kind: AgentKind,
    status: AgentStatus,
    cadenceSeconds: IDL.Nat,
    budgetDailyJobs: IDL.Nat,
    budgetDailyLlmCalls: IDL.Nat,
    lastRunAt: IDL.Int,
    nextRunAt: IDL.Int,
    jobsToday: IDL.Nat,
    llmCallsToday: IDL.Nat,
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

  const AuditEntry = IDL.Record({
    id: IDL.Nat,
    at: IDL.Int,
    actorLabel: IDL.Text,
    action: IDL.Text,
    detail: IDL.Text,
  });

  const SubscriberPublic = IDL.Record({
    email: IDL.Text,
    status: SubscriberStatus,
    subscribedAt: IDL.Int,
    confirmedAt: IDL.Opt(IDL.Int),
  });

  const NewsletterIssue = IDL.Record({
    weekKey: IDL.Text,
    subject: IDL.Text,
    htmlBody: IDL.Text,
    draftId: IDL.Nat,
    sentAt: IDL.Int,
    recipientCount: IDL.Nat,
  });

  const SubscribeResult = IDL.Record({
    success: IDL.Bool,
    message: IDL.Text,
  });

  return IDL.Service({
    listAgents: IDL.Func([], [IDL.Vec(AgentPublic)], ["query"]),
    setAgentStatus: IDL.Func([IDL.Nat, AgentStatus], [], []),
    setAgentBudgets: IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat], [], []),
    enqueueJob: IDL.Func([IDL.Nat, IDL.Text], [IDL.Nat], []),
    listDrafts: IDL.Func(
      [IDL.Nat, IDL.Opt(DraftStatus)],
      [IDL.Vec(DraftPublic)],
      ["query"],
    ),
    approveDraft: IDL.Func([IDL.Nat], [], []),
    rejectDraft: IDL.Func([IDL.Nat, IDL.Text], [], []),
    rejectAllPendingDrafts: IDL.Func([IDL.Text], [IDL.Nat], []),
    countPendingDrafts: IDL.Func([], [IDL.Nat], ["query"]),
    editDraft: IDL.Func([IDL.Nat, IDL.Text, IDL.Text], [], []),
    markDraftSent: IDL.Func([IDL.Nat], [], []),
    getApprovedDraftsForSend: IDL.Func([IDL.Nat], [IDL.Vec(DraftPublic)], ["query"]),
    listSubscribers: IDL.Func([IDL.Nat], [IDL.Vec(SubscriberPublic)], ["query"]),
    listSecretNames: IDL.Func([], [IDL.Vec(IDL.Text)], ["query"]),
    setSecret: IDL.Func([IDL.Text, IDL.Text], [], []),
    getSecrets: IDL.Func([IDL.Vec(IDL.Text)], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], []),
    getAuditLogEntries: IDL.Func([IDL.Nat], [IDL.Vec(AuditEntry)], ["query"]),
    listAgentPrincipals: IDL.Func([], [IDL.Vec(IDL.Principal)], ["query"]),
    addAgentPrincipal: IDL.Func([IDL.Principal], [], []),
    removeAgentPrincipal: IDL.Func([IDL.Principal], [], []),
    setBackendCanisterId: IDL.Func([IDL.Text], [], []),
    getBackendCanisterId: IDL.Func([], [IDL.Text], ["query"]),
    listNewsletterIssues: IDL.Func([IDL.Nat], [IDL.Vec(NewsletterIssue)], ["query"]),
    subscribeNewsletter: IDL.Func([IDL.Text], [SubscribeResult], []),
    confirmSubscription: IDL.Func([IDL.Text], [SubscribeResult], []),
    unsubscribe: IDL.Func([IDL.Text], [SubscribeResult], []),
    getCycleBalance: IDL.Func([], [IDL.Nat], ["query"]),
    ensureAdminRegistration: IDL.Func([], [IDL.Bool], []),
  });
};

export interface AgentHubActor {
  listAgents(): Promise<
    Array<{
      id: bigint;
      name: string;
      kind: Record<string, null>;
      status: Record<string, null>;
      cadenceSeconds: bigint;
      budgetDailyJobs: bigint;
      budgetDailyLlmCalls: bigint;
      lastRunAt: bigint;
      nextRunAt: bigint;
      jobsToday: bigint;
      llmCallsToday: bigint;
    }>
  >;
  setAgentStatus(agentId: bigint, status: Record<string, null>): Promise<void>;
  setAgentBudgets(
    agentId: bigint,
    budgetDailyJobs: bigint,
    budgetDailyLlmCalls: bigint,
  ): Promise<void>;
  enqueueJob(agentId: bigint, payload: string): Promise<bigint>;
  listDrafts(
    limit: bigint,
    statusFilter: [] | [Record<string, null>],
  ): Promise<
    Array<{
      id: bigint;
      agentKind: Record<string, null>;
      jobId: [] | [bigint];
      title: string;
      body: string;
      platform: [] | [string];
      status: Record<string, null>;
      compliancePassed: boolean;
      complianceNotes: string;
      createdAt: bigint;
      reviewedAt: [] | [bigint];
      reviewedBy: [] | [Principal];
      sentAt: [] | [bigint];
      metadata: string;
    }>
  >;
  approveDraft(draftId: bigint): Promise<void>;
  rejectDraft(draftId: bigint, reason: string): Promise<void>;
  rejectAllPendingDrafts(reason: string): Promise<bigint>;
  countPendingDrafts(): Promise<bigint>;
  editDraft(draftId: bigint, title: string, body: string): Promise<void>;
  markDraftSent(draftId: bigint): Promise<void>;
  getApprovedDraftsForSend(limit: bigint): Promise<unknown[]>;
  listSubscribers(limit: bigint): Promise<
    Array<{
      email: string;
      status: Record<string, null>;
      subscribedAt: bigint;
      confirmedAt: [] | [bigint];
    }>
  >;
  listSecretNames(): Promise<string[]>;
  setSecret(name: string, value: string): Promise<void>;
  getSecrets(names: string[]): Promise<[string, string][]>;
  getAuditLogEntries(limit: bigint): Promise<
    Array<{
      id: bigint;
      at: bigint;
      actorLabel: string;
      action: string;
      detail: string;
    }>
  >;
  listAgentPrincipals(): Promise<Principal[]>;
  addAgentPrincipal(p: Principal): Promise<void>;
  removeAgentPrincipal(p: Principal): Promise<void>;
  setBackendCanisterId(id: string): Promise<void>;
  getBackendCanisterId(): Promise<string>;
  listNewsletterIssues(limit: bigint): Promise<unknown[]>;
  subscribeNewsletter(email: string): Promise<{ success: boolean; message: string }>;
  confirmSubscription(token: string): Promise<{ success: boolean; message: string }>;
  unsubscribe(token: string): Promise<{ success: boolean; message: string }>;
  getCycleBalance(): Promise<bigint>;
  ensureAdminRegistration(): Promise<boolean>;
}

let cachedAgent: AgentHubActor | null = null;
let cachedAuthAgent: AgentHubActor | null = null;

async function createAgent(identity?: import("@dfinity/agent").Identity) {
  const canisterId = AGENT_HUB_CANISTER_ID;
  if (!canisterId) return null;
  const host =
    typeof window !== "undefined" && window.location.hostname.includes("localhost")
      ? "http://127.0.0.1:4943"
      : "https://icp0.io";
  const agent = new HttpAgent({ host, identity });
  if (host.includes("127.0.0.1")) {
    await agent.fetchRootKey();
  }
  return Actor.createActor<AgentHubActor>(agentHubIdlFactory, {
    agent,
    canisterId,
  });
}

export async function getAgentHubActor(): Promise<AgentHubActor | null> {
  if (cachedAgent) return cachedAgent;
  cachedAgent = await createAgent();
  return cachedAgent;
}

export async function getAuthenticatedAgentHubActor(): Promise<AgentHubActor | null> {
  if (cachedAuthAgent) return cachedAuthAgent;
  const authClient = await AuthClient.create();
  const identity = authClient.getIdentity();
  if (identity.getPrincipal().isAnonymous()) return null;
  cachedAuthAgent = await createAgent(identity);
  return cachedAuthAgent;
}

export function agentKindLabel(kind: Record<string, null>): string {
  const key = Object.keys(kind)[0] ?? "unknown";
  return key.replace(/_/g, " ");
}

export function statusLabel(status: Record<string, null>): string {
  return Object.keys(status)[0] ?? "unknown";
}

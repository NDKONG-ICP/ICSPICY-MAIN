import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AgentCanisterLink {
  'agentKind' : AgentKind,
  'agentName' : string,
  'agentId' : bigint,
  'canisterId' : Principal,
}
export interface AgentHub {
  'addAdmin' : ActorMethod<[Principal], undefined>,
  'addAgentPrincipal' : ActorMethod<[Principal], undefined>,
  'adminAttachAgentCanister' : ActorMethod<[bigint, Principal], undefined>,
  'adminDetachAgentCanister' : ActorMethod<[bigint], undefined>,
  'approveDraft' : ActorMethod<[bigint], undefined>,
  'archiveNewsletterIssue' : ActorMethod<
    [string, string, string, bigint, bigint],
    undefined
  >,
  'claimJobs' : ActorMethod<[bigint], Array<JobPublic>>,
  'confirmSubscription' : ActorMethod<[string], SubscribeResult>,
  'editDraft' : ActorMethod<[bigint, string, string], undefined>,
  'enqueueJob' : ActorMethod<[bigint, string], bigint>,
  /**
   * / Register caller as agent_hub admin when they are a backend admin (one-time sync).
   */
  'ensureAdminRegistration' : ActorMethod<[], boolean>,
  'getApprovedDraftsForSend' : ActorMethod<[bigint], Array<DraftPublic>>,
  'getAuditLog' : ActorMethod<[bigint, bigint], Array<AuditEntry>>,
  'getAuditLogEntries' : ActorMethod<[bigint], Array<AuditEntry>>,
  'getBackendCanisterId' : ActorMethod<[], string>,
  'getCycleBalance' : ActorMethod<[], bigint>,
  'getNewsletterIssue' : ActorMethod<[string], [] | [NewsletterIssue]>,
  'getSecrets' : ActorMethod<[Array<string>], Array<[string, string]>>,
  'listAdmins' : ActorMethod<[], Array<Principal>>,
  'listAgentCanisterLinks' : ActorMethod<[], Array<AgentCanisterLink>>,
  'listAgentPrincipals' : ActorMethod<[], Array<Principal>>,
  'listAgents' : ActorMethod<[], Array<AgentPublic>>,
  'listConfirmedSubscriberEmails' : ActorMethod<[bigint], Array<string>>,
  'listDrafts' : ActorMethod<[bigint, [] | [DraftStatus]], Array<DraftPublic>>,
  'listJobs' : ActorMethod<[bigint, [] | [JobStatus]], Array<JobPublic>>,
  'listNewsletterIssues' : ActorMethod<[bigint], Array<NewsletterIssue>>,
  'listSecretNames' : ActorMethod<[], Array<string>>,
  'listSubscribers' : ActorMethod<[bigint], Array<SubscriberPublic>>,
  'markDraftSent' : ActorMethod<[bigint], undefined>,
  'recordLlmCall' : ActorMethod<[bigint], boolean>,
  'rejectDraft' : ActorMethod<[bigint, string], undefined>,
  'removeAdmin' : ActorMethod<[Principal], undefined>,
  'removeAgentPrincipal' : ActorMethod<[Principal], undefined>,
  'reportJobComplete' : ActorMethod<
    [bigint, boolean, [] | [string]],
    undefined
  >,
  'reportRun' : ActorMethod<[AgentKind, string], undefined>,
  'setAgentBudgets' : ActorMethod<[bigint, bigint, bigint], undefined>,
  'setAgentStatus' : ActorMethod<[bigint, AgentStatus], undefined>,
  'setBackendCanisterId' : ActorMethod<[string], undefined>,
  'setSecret' : ActorMethod<[string, string], undefined>,
  'submitDraft' : ActorMethod<
    [
      AgentKind,
      [] | [bigint],
      string,
      string,
      [] | [string],
      boolean,
      string,
      string,
    ],
    bigint
  >,
  'subscribeNewsletter' : ActorMethod<[string], SubscribeResult>,
  'unsubscribe' : ActorMethod<[string], SubscribeResult>,
}
export type AgentKind = { 'social_x' : null } |
  { 'orders_claims_ops' : null } |
  { 'community_moderator' : null } |
  { 'social_facebook' : null } |
  { 'social_tiktok' : null } |
  { 'email_correspondence' : null } |
  { 'weather_sentinel' : null } |
  { 'analytics_digest' : null } |
  { 'orchestrator' : null } |
  { 'nims_ops' : null } |
  { 'weather_concierge' : null } |
  { 'fleet_cycles_ops' : null } |
  { 'newsletter' : null } |
  { 'social_youtube' : null } |
  { 'social_instagram' : null } |
  { 'compliance_reviewer' : null };
export interface AgentPublic {
  'id' : bigint,
  'status' : AgentStatus,
  'cadenceSeconds' : bigint,
  'lastRunAt' : bigint,
  'kind' : AgentKind,
  'name' : string,
  'budgetDailyJobs' : bigint,
  'llmCallsToday' : bigint,
  'nextRunAt' : bigint,
  'budgetDailyLlmCalls' : bigint,
  'jobsToday' : bigint,
}
export type AgentStatus = { 'active' : null } |
  { 'disabled' : null } |
  { 'paused' : null };
export interface AuditEntry {
  'at' : bigint,
  'id' : bigint,
  'action' : string,
  'detail' : string,
  'actorLabel' : string,
}
export interface DraftPublic {
  'id' : bigint,
  'status' : DraftStatus,
  'title' : string,
  'metadata' : string,
  'body' : string,
  'createdAt' : bigint,
  'agentKind' : AgentKind,
  'jobId' : [] | [bigint],
  'platform' : [] | [string],
  'sentAt' : [] | [bigint],
  'reviewedAt' : [] | [bigint],
  'reviewedBy' : [] | [Principal],
  'compliancePassed' : boolean,
  'complianceNotes' : string,
}
export type DraftStatus = { 'pending' : null } |
  { 'sent' : null } |
  { 'approved' : null } |
  { 'rejected' : null };
export interface JobPublic {
  'id' : bigint,
  'status' : JobStatus,
  'completedAt' : [] | [bigint],
  'kind' : AgentKind,
  'createdAt' : bigint,
  'agentId' : bigint,
  'error' : [] | [string],
  'claimedAt' : [] | [bigint],
  'claimedBy' : [] | [Principal],
  'payload' : string,
}
export type JobStatus = { 'done' : null } |
  { 'claimed' : null } |
  { 'queued' : null } |
  { 'failed' : null };
export interface NewsletterIssue {
  'htmlBody' : string,
  'weekKey' : string,
  'subject' : string,
  'sentAt' : bigint,
  'recipientCount' : bigint,
  'draftId' : bigint,
}
export interface SubscribeResult { 'message' : string, 'success' : boolean }
export interface SubscriberPublic {
  'status' : SubscriberStatus,
  'subscribedAt' : bigint,
  'confirmedAt' : [] | [bigint],
  'email' : string,
}
export type SubscriberStatus = { 'pending' : null } |
  { 'unsubscribed' : null } |
  { 'confirmed' : null };
export interface _SERVICE extends AgentHub {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

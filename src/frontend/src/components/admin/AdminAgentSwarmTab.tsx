import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBackendActor } from "@/hooks/useBackend";
import {
  agentKindLabel,
  getAuthenticatedAgentHubActor,
  statusLabel,
} from "@/lib/agent-hub-idl";
import {
  fetchDailyAlmanac,
  type DailyAlmanacData,
} from "@/lib/weather-service";
import {
  Bot,
  CheckCircle2,
  CloudSun,
  KeyRound,
  Leaf,
  Mail,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminCapsaicinTab } from "./AdminCapsaicinTab";

type AgentPublic = {
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
};

type DraftPublic = {
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
  reviewedBy: [] | [import("@dfinity/principal").Principal];
  sentAt: [] | [bigint];
  metadata: string;
};

type AuditEntry = {
  id: bigint;
  at: bigint;
  actorLabel: string;
  action: string;
  detail: string;
};

type SubscriberPublic = {
  email: string;
  status: Record<string, null>;
  subscribedAt: bigint;
  confirmedAt: [] | [bigint];
};

const SECRET_PRESETS = [
  "resend_api_key",
  "resend_from_email",
  "llm_api_key_anthropic",
  "llm_api_key_openai",
  "llm_route_default",
  "llm_route_newsletter",
  "llm_route_almanac",
  "llm_route_social",
  "llm_route_sentinel",
  "llm_route_analytics",
  "llm_route_compliance",
  "llm_route_email",
  "llm_route_ambassador",
  "llm_api_key",
  "llm_provider",
  "llm_model",
  "admin_alert_email",
  "newsletter_reply_to",
  "ambassador_sweep_principal",
  "canopy_wallet_principal",
  "crumbeatr_canister_id",
  "swop_backend_canister_id",
  "bonsai_registry_canister_id",
  "bonsai_orbit_canister_id",
  "bonsai_bazaar_canister_id",
] as const;

function formatTs(ns: bigint): string {
  if (ns === 0n) return "—";
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toLocaleString();
}

function cadenceLabel(seconds: bigint): string {
  const s = Number(seconds);
  if (s >= 86_400) return `${Math.round(s / 86_400)}d`;
  if (s >= 3600) return `${Math.round(s / 3600)}h`;
  return `${s}s`;
}

export function AdminAgentSwarmTab() {
  const { actor: backendActor } = useBackendActor();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentPublic[]>([]);
  const [drafts, setDrafts] = useState<DraftPublic[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberPublic[]>([]);
  const [secretNames, setSecretNames] = useState<string[]>([]);
  const [agentPrincipals, setAgentPrincipals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [secretName, setSecretName] = useState("resend_api_key");
  const [secretValue, setSecretValue] = useState("");
  const [newAgentPrincipal, setNewAgentPrincipal] = useState("");
  const [editDraftId, setEditDraftId] = useState<bigint | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [almanacDateKey, setAlmanacDateKey] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [todayAlmanac, setTodayAlmanac] = useState<DailyAlmanacData | null>(
    null,
  );
  const [almanacBusy, setAlmanacBusy] = useState(false);

  const loadAlmanac = useCallback(async (dateKey?: string) => {
    const key = dateKey ?? almanacDateKey;
    setAlmanacBusy(true);
    try {
      setTodayAlmanac(await fetchDailyAlmanac(key));
    } finally {
      setAlmanacBusy(false);
    }
  }, [almanacDateKey]);

  async function retractAlmanac() {
    if (!backendActor) {
      toast.error("Sign in as admin");
      return;
    }
    type RetractActor = {
      adminRetractAlmanac: (dateKey: string) => Promise<void>;
    };
    try {
      await (backendActor as unknown as RetractActor).adminRetractAlmanac(
        almanacDateKey,
      );
      toast.success(`Almanac ${almanacDateKey} retracted`);
      await loadAlmanac(almanacDateKey);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retract failed");
    }
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hub = await getAuthenticatedAgentHubActor();
      if (!hub) {
        setError("Sign in as admin and configure CANISTER_ID_AGENT_HUB.");
        return;
      }
      await hub.ensureAdminRegistration();
      const [agentList, draftList, auditList, subList, names, principals, pendingTotal] =
        await Promise.all([
          hub.listAgents(),
          hub.listDrafts(50n, [{ pending: null }]),
          hub.getAuditLogEntries(100n),
          hub.listSubscribers(200n),
          hub.listSecretNames(),
          hub.listAgentPrincipals(),
          hub.countPendingDrafts(),
        ]);
      setAgents(agentList as AgentPublic[]);
      setDrafts(draftList as DraftPublic[]);
      setAudit(auditList as AuditEntry[]);
      setSubscribers(subList as SubscriberPublic[]);
      setSecretNames(names as string[]);
      setPendingCount(Number(pendingTotal));
      setAgentPrincipals(
        (principals as import("@dfinity/principal").Principal[]).map((p) =>
          p.toText(),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agent hub");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void loadAlmanac();
  }, [loadAlmanac]);

  async function setAgentPaused(agentId: bigint, pause: boolean) {
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub) return;
    await hub.setAgentStatus(agentId, pause ? { paused: null } : { active: null });
    toast.success(pause ? "Agent paused" : "Agent resumed");
    await loadAll();
  }

  async function saveBudget(agent: AgentPublic) {
    const jobs = prompt(
      "Daily job budget",
      String(agent.budgetDailyJobs),
    );
    const llm = prompt(
      "Daily LLM call budget",
      String(agent.budgetDailyLlmCalls),
    );
    if (!jobs || !llm) return;
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub) return;
    await hub.setAgentBudgets(agent.id, BigInt(jobs), BigInt(llm));
    toast.success("Budget updated");
    await loadAll();
  }

  async function approveDraft(id: bigint) {
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub) return;
    await hub.approveDraft(id);
    toast.success("Draft approved");
    await loadAll();
  }

  async function rejectDraft(id: bigint) {
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub) return;
    await hub.rejectDraft(id, rejectReason || "Rejected by admin");
    toast.success("Draft rejected");
    setRejectReason("");
    await loadAll();
  }

  async function rejectAllPending() {
    if (pendingCount === 0) return;
    const reason =
      rejectReason.trim() || "bulk clear — template / backlog";
    if (
      !window.confirm(
        `Reject ALL ${pendingCount} pending draft(s)?\n\nReason: ${reason}\n\nThis cannot be undone.`,
      )
    ) {
      return;
    }
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub) return;
    setBulkRejecting(true);
    try {
      const n = await hub.rejectAllPendingDrafts(reason);
      toast.success(`Rejected ${String(n)} pending draft(s)`);
      setRejectReason("");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk reject failed");
    } finally {
      setBulkRejecting(false);
    }
  }

  async function saveDraftEdit() {
    if (editDraftId === null) return;
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub) return;
    await hub.editDraft(editDraftId, editTitle, editBody);
    toast.success("Draft updated");
    setEditDraftId(null);
    await loadAll();
  }

  async function saveSecret() {
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub) return;
    await hub.setSecret(secretName, secretValue);
    toast.success(`Secret "${secretName}" saved`);
    setSecretValue("");
    await loadAll();
  }

  async function registerAgentPrincipal() {
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub || !newAgentPrincipal.trim()) return;
    const { Principal } = await import("@dfinity/principal");
    const p = Principal.fromText(newAgentPrincipal.trim());
    await hub.addAgentPrincipal(p);
    if (backendActor && "addAgentPrincipal" in backendActor) {
      await (backendActor as typeof backendActor & {
        addAgentPrincipal: (p: import("@dfinity/principal").Principal) => Promise<void>;
      }).addAgentPrincipal(p);
    }
    toast.success("Worker principal registered (hub + backend)");
    setNewAgentPrincipal("");
    await loadAll();
  }

  async function removePrincipal(principal: string) {
    const hub = await getAuthenticatedAgentHubActor();
    if (!hub) return;
    const { Principal } = await import("@dfinity/principal");
    await hub.removeAgentPrincipal(Principal.fromText(principal));
    toast.success("Worker principal removed");
    await loadAll();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-card p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  const pendingDrafts = drafts.filter(
    (d) => Object.keys(d.status)[0] === "pending",
  );

  return (
    <div className="space-y-6" data-ocid="admin-agent-swarm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Agent Swarm
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Orchestrator, social drafts, newsletter, ops agents — approve before
            send.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadAll()}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="roster">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="capsaicin" className="gap-1">
            <Leaf className="w-3.5 h-3.5" />
            Capsaicin
          </TabsTrigger>
          <TabsTrigger value="queue">
            Approval Queue
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="secrets">Secrets</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-3 mt-4">
          {agents.map((agent) => {
            const status = statusLabel(agent.status);
            return (
              <div
                key={String(agent.id)}
                className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between"
              >
                <div>
                  <p className="font-semibold">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {agentKindLabel(agent.kind)} · every {cadenceLabel(agent.cadenceSeconds)} ·
                    jobs today {String(agent.jobsToday)}/{String(agent.budgetDailyJobs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last run {formatTs(agent.lastRunAt)} · Next {formatTs(agent.nextRunAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status === "active" ? "default" : "secondary"}>
                    {status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void setAgentPaused(agent.id, status === "active")
                    }
                  >
                    {status === "active" ? (
                      <PauseCircle className="w-4 h-4" />
                    ) : (
                      <PlayCircle className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void saveBudget(agent)}
                  >
                    Budget
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="capsaicin" className="mt-4">
          <AdminCapsaicinTab />
        </TabsContent>

        <TabsContent value="queue" className="space-y-4 mt-4">
          {pendingCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-xl border border-border bg-card p-3">
              <p className="text-sm text-muted-foreground">
                {pendingCount} pending total
                {pendingDrafts.length < pendingCount
                  ? ` · showing ${pendingDrafts.length}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  placeholder="Bulk reject reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="max-w-xs h-8"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkRejecting}
                  onClick={() => void rejectAllPending()}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {bulkRejecting ? "Rejecting…" : "Reject all pending"}
                </Button>
              </div>
            </div>
          )}
          {pendingDrafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending drafts.</p>
          ) : (
            pendingDrafts.map((draft) => (
              <div
                key={String(draft.id)}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{draft.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {agentKindLabel(draft.agentKind)}
                      {draft.platform[0] ? ` · ${draft.platform[0]}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={draft.compliancePassed ? "default" : "destructive"}
                    className="gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {draft.compliancePassed ? "Compliance OK" : "Flagged"}
                  </Badge>
                </div>
                {draft.complianceNotes && (
                  <p className="text-xs text-muted-foreground">
                    {draft.complianceNotes}
                  </p>
                )}
                <pre className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3 max-h-48 overflow-auto">
                  {draft.body}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void approveDraft(draft.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditDraftId(draft.id);
                      setEditTitle(draft.title);
                      setEditBody(draft.body);
                    }}
                  >
                    Edit
                  </Button>
                  <Input
                    placeholder="Reject reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="max-w-xs h-8"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void rejectDraft(draft.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
          {editDraftId !== null && (
            <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
              <p className="font-semibold">Edit draft #{String(editDraftId)}</p>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={8}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void saveDraftEdit()}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditDraftId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-[480px] overflow-auto">
            {audit.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No audit entries.</p>
            ) : (
              audit.map((entry) => (
                <div key={String(entry.id)} className="p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTs(entry.at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.actorLabel}</p>
                  <p className="text-xs mt-1">{entry.detail}</p>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {subscribers.filter((s) => Object.keys(s.status)[0] === "confirmed").length}{" "}
            confirmed · {subscribers.length} total
          </p>
          <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-[400px] overflow-auto">
            {subscribers.map((s) => (
              <div
                key={s.email}
                className="p-3 flex justify-between items-center text-sm"
              >
                <span>{s.email}</span>
                <Badge variant="secondary">{statusLabel(s.status)}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weather" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-primary" />
              Daily almanac
            </h3>
            <p className="text-sm text-muted-foreground">
              Weather Concierge auto-publishes each morning. Retract a bad
              edition without deleting on-chain history.
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label htmlFor="almanac-date">Date key</Label>
                <Input
                  id="almanac-date"
                  type="date"
                  value={almanacDateKey}
                  onChange={(e) => setAlmanacDateKey(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={almanacBusy}
                onClick={() => void loadAlmanac(almanacDateKey)}
              >
                Load
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!todayAlmanac || almanacBusy}
                onClick={() => void retractAlmanac()}
              >
                Retract
              </Button>
            </div>
            {todayAlmanac ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-semibold">{todayAlmanac.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {todayAlmanac.body}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {almanacBusy
                  ? "Loading…"
                  : "No published almanac for this date."}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="secrets" className="mt-4 space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              API secrets
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Secret name</Label>
                <Select value={secretName} onValueChange={setSecretName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECRET_PRESETS.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  type="password"
                  value={secretValue}
                  onChange={(e) => setSecretValue(e.target.value)}
                  placeholder="Paste API key or email"
                />
              </div>
            </div>
            <Button size="sm" onClick={() => void saveSecret()}>
              Save secret
            </Button>
            {secretNames.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Configured: {secretNames.join(", ")}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Worker principals
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder="Worker principal (seed-phrase identity)"
                value={newAgentPrincipal}
                onChange={(e) => setNewAgentPrincipal(e.target.value)}
              />
              <Button size="sm" onClick={() => void registerAgentPrincipal()}>
                Register
              </Button>
            </div>
            <ul className="text-sm space-y-1">
              {agentPrincipals.map((p) => (
                <li key={p} className="flex justify-between items-center gap-2">
                  <code className="text-xs break-all">{p}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void removePrincipal(p)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

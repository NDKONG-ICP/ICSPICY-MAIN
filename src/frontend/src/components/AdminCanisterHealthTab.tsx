import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  Check,
  Coins,
  Copy,
  Cpu,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Zap,
  CalendarClock,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import {
  type FleetAutoTopUpPolicy,
  type FleetCanisterEntry,
  type FleetProbeStatus,
  type FleetTargetCategory,
  type SwarmCanisterInput,
  type SwarmCanisterStatus,
  useAdminRegisterSwarmCanister,
  useAdminRemoveSwarmCanister,
  useAdminRunFleetAutoTopUp,
  useAdminSetSwarmCanisterAutoTopUp,
  useAdminTopUpCanisterFromTreasuryIcp,
  useAdminUpdateSwarmCanister,
  useFleetAutoTopUpPolicy,
  useFleetCanisterHealth,
  useLpFeeCyclesConfig,
  useLpFeeCyclesEvents,
  usePreviewLpFeeCyclesDryRun,
  useSetFleetAutoTopUpPolicy,
  useSetLpFeeCyclesConfig,
  useAdminRunLpFeeCyclesFunding,
  useSwarmCanisterTargets,
} from "../hooks/useBackend";
import {
  CYCLE_TOP_UP_PRESETS,
  CYCLES_WALLET_ID,
  ICP_TOP_UP_PRESETS,
  formatCyclesShort,
  formatIcpE8s,
  getCyclesWalletBalance,
  sendCyclesFromWallet,
} from "../lib/cycles-topup";

const T = 1_000_000_000_000n;
const WARNING_CYCLES = T;
const CRITICAL_CYCLES = 500_000_000_000n;

function formatCycles(cycles: bigint): string {
  const trillions = Number(cycles) / 1e12;
  if (trillions >= 1) return `${trillions.toFixed(2)} T`;
  const billions = Number(cycles) / 1e9;
  if (billions >= 1) return `${billions.toFixed(1)} B`;
  const millions = Number(cycles) / 1e6;
  return `${millions.toFixed(0)} M`;
}

function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(2)} GB`;
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function severity(cycles: bigint): "ok" | "warning" | "critical" {
  if (cycles < CRITICAL_CYCLES) return "critical";
  if (cycles < WARNING_CYCLES) return "warning";
  return "ok";
}

const BURN_SAMPLE_MS = 60 * 60 * 1000; // 1h min window (matches backend)

function burnStatusLabel(
  burnPerDay: bigint,
  lastBurnSampleAt: bigint,
): { text: string; title: string } {
  if (burnPerDay > 0n) {
    return {
      text: `${formatCycles(burnPerDay)}/day`,
      title: "Observed from balance samples; top-ups excluded",
    };
  }
  if (lastBurnSampleAt <= 0n) {
    return {
      text: "no baseline",
      title: "Refresh fleet health to set the first balance baseline",
    };
  }
  // Motoko Time.now() is nanoseconds
  const lastMs = Number(lastBurnSampleAt / 1_000_000n);
  const readyAt = lastMs + BURN_SAMPLE_MS;
  const leftMs = Math.max(0, readyAt - Date.now());
  if (leftMs <= 0) {
    return {
      text: "ready — refresh",
      title: "Sample window elapsed — tap Refresh to compute burn rate",
    };
  }
  const leftMin = Math.ceil(leftMs / 60_000);
  const leftH = Math.floor(leftMin / 60);
  const mins = leftMin % 60;
  const wait =
    leftH > 0 ? `~${leftH}h ${mins}m` : `~${mins}m`;
  return {
    text: `baseline · ${wait}`,
    title: `Baseline set. Rate appears after ≥1h (timer also runs every 6h). ${wait} left — then Refresh.`,
  };
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`Copied ${label}`);
  } catch {
    toast.error("Could not copy — select the ID manually");
  }
}

function CopyableId({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void (async () => {
          await copyText(label, id);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        })();
      }}
      className="group inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-left font-mono text-[11px] text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
      title={`${id}\nClick to copy`}
      data-ocid={`admin-copy-canister-${label}`}
    >
      <span className="truncate">{id}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0 opacity-50 group-hover:opacity-100" aria-hidden />
      )}
      <span className="sr-only">Copy {label} canister ID</span>
    </button>
  );
}

function probeStatusLabel(status: FleetProbeStatus): string {
  switch (status) {
    case "ok":
      return "Healthy";
    case "denied":
      return "No access";
    case "error":
      return "Probe failed";
  }
}

type TopUpMode = "wallet" | "treasury";

function TopUpDialog({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: {
  entry: FleetCanisterEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { identity } = useAuth();
  const treasuryTopUp = useAdminTopUpCanisterFromTreasuryIcp();
  const [mode, setMode] = useState<TopUpMode>("wallet");
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCycles, setSelectedCycles] = useState<bigint>(
    CYCLE_TOP_UP_PRESETS[1].cycles,
  );
  const [selectedIcpE8s, setSelectedIcpE8s] = useState<bigint>(
    ICP_TOP_UP_PRESETS[1].e8s,
  );

  useEffect(() => {
    if (!open || !identity) {
      setWalletBalance(null);
      return;
    }
    let cancelled = false;
    setLoadingWallet(true);
    getCyclesWalletBalance(identity)
      .then((bal) => {
        if (!cancelled) setWalletBalance(bal);
      })
      .catch(() => {
        if (!cancelled) setWalletBalance(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingWallet(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, identity]);

  if (!entry) return null;

  async function handleTopUp() {
    if (!entry) return;
    setSubmitting(true);
    try {
      if (mode === "wallet") {
        if (!identity) throw new Error("Sign in with Internet Identity first");
        await sendCyclesFromWallet(identity, entry.canisterId, selectedCycles);
        toast.success(
          `Sent ${formatCyclesShort(selectedCycles)} cycles to ${entry.name}`,
        );
      } else {
        const result = await treasuryTopUp.mutateAsync({
          targetCanisterId: entry.canisterId,
          icpE8s: selectedIcpE8s,
        });
        toast.success(
          result.message ||
            `Treasury top-up sent ${formatIcpE8s(selectedIcpE8s)} ICP to ${entry.name}`,
        );
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-ocid="admin-canister-topup-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize">
            <Coins className="w-4 h-4 text-primary" />
            Top up {entry.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] break-all">
            {entry.canisterId}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "wallet" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("wallet")}
          >
            Cycles wallet
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "treasury" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("treasury")}
          >
            Treasury ICP
          </Button>
        </div>

        {mode === "wallet" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Deposits cycles from{" "}
              <code className="font-mono text-[10px]">{CYCLES_WALLET_ID}</code>.
              Your II principal must be a controller on that wallet.
            </p>
            <p className="text-xs">
              Wallet balance:{" "}
              {loadingWallet ? (
                <span className="text-muted-foreground">Loading…</span>
              ) : walletBalance != null ? (
                <strong>{formatCyclesShort(walletBalance)}</strong>
              ) : (
                <span className="text-muted-foreground">Unavailable</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {CYCLE_TOP_UP_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={
                    selectedCycles === preset.cycles ? "default" : "outline"
                  }
                  onClick={() => setSelectedCycles(preset.cycles)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Converts backend treasury ICP to cycles via the Cycles Minting
              Canister. Rate limited to 3 manual top-ups per hour.
            </p>
            <div className="flex flex-wrap gap-2">
              {ICP_TOP_UP_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={
                    selectedIcpE8s === preset.e8s ? "default" : "outline"
                  }
                  onClick={() => setSelectedIcpE8s(preset.e8s)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleTopUp()}
            disabled={submitting}
            data-ocid="admin-canister-topup-confirm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Topping up…
              </>
            ) : mode === "wallet" ? (
              `Send ${formatCyclesShort(selectedCycles)}`
            ) : (
              `Spend ${formatIcpE8s(selectedIcpE8s)} ICP`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function categoryLabel(category: FleetTargetCategory): string {
  switch (category) {
    case "asset":
      return "Asset";
    case "agent":
      return "Agent";
    case "weather":
      return "Weather";
    case "workerBridge":
      return "Worker";
    default:
      return "Core";
  }
}

function emptySwarmInput(): SwarmCanisterInput {
  return {
    name: "",
    canisterId: "",
    kind: "remoteHealthQuery",
    category: "agent",
    agentKind: null,
    enabled: true,
    autoTopUpEnabled: false,
    thresholdCycles: 500_000_000_000n,
    icpPerTopUpE8s: 10_000_000n,
    maxIcpPerDayE8s: 100_000_000n,
    notes: "",
  };
}

function SwarmCanistersPanel() {
  const { data: targets = [], isLoading } = useSwarmCanisterTargets();
  const register = useAdminRegisterSwarmCanister();
  const update = useAdminUpdateSwarmCanister();
  const remove = useAdminRemoveSwarmCanister();
  const setAutoTopUp = useAdminSetSwarmCanisterAutoTopUp();
  const [form, setForm] = useState<SwarmCanisterInput>(emptySwarmInput());
  const [editId, setEditId] = useState<string | null>(null);

  async function handleSave() {
    try {
      if (editId) {
        await update.mutateAsync({ previousCanisterId: editId, input: form });
        toast.success("Swarm canister updated");
      } else {
        await register.mutateAsync(form);
        toast.success("Swarm canister registered");
      }
      setForm(emptySwarmInput());
      setEditId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function handleRemove(canisterId: string) {
    try {
      await remove.mutateAsync(canisterId);
      toast.success("Swarm canister removed");
      if (editId === canisterId) {
        setEditId(null);
        setForm(emptySwarmInput());
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function toggleAutoTopUp(row: SwarmCanisterStatus) {
    try {
      await setAutoTopUp.mutateAsync({
        canisterId: row.target.canisterId,
        enabled: !row.target.autoTopUpEnabled,
        thresholdCycles: row.target.thresholdCycles,
        icpPerTopUpE8s: row.target.icpPerTopUpE8s,
        maxIcpPerDayE8s: row.target.maxIcpPerDayE8s,
      });
      toast.success("Swarm auto top-up updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Policy update failed");
    }
  }

  return (
    <section
      className="rounded-xl border border-border p-4 space-y-4"
      data-ocid="admin-swarm-canisters-panel"
    >
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          Swarm Canisters
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Register dedicated agent/worker canisters for fleet health, burn
          tracking, treasury top-up, and per-target auto funding.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="weather_concierge"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Canister ID</Label>
          <Input
            value={form.canisterId}
            onChange={(e) =>
              setForm((f) => ({ ...f, canisterId: e.target.value.trim() }))
            }
            placeholder="xxxx-xxxxx-..."
            className="h-9 font-mono text-[11px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Agent kind (optional)</Label>
          <Input
            value={form.agentKind ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                agentKind: e.target.value.trim() || null,
              }))
            }
            placeholder="weather_concierge"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as FleetTargetCategory,
              }))
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="agent">Agent</option>
            <option value="weather">Weather</option>
            <option value="workerBridge">Worker bridge</option>
            <option value="core">Core</option>
            <option value="asset">Asset</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Probe kind</Label>
          <select
            value={form.kind}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kind: e.target.value as SwarmCanisterInput["kind"],
              }))
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="remoteHealthQuery">Remote health query</option>
            <option value="managementStatus">Management status</option>
            <option value="local">Local (this backend)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Threshold (T cycles)</Label>
          <Input
            value={(Number(form.thresholdCycles) / 1e12).toString()}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                thresholdCycles: BigInt(
                  Math.round(parseFloat(e.target.value || "0.5") * 1e12),
                ),
              }))
            }
            className="h-9 font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.enabled}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, enabled: checked }))
            }
          />
          <Label className="text-xs">Enabled in fleet</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.autoTopUpEnabled}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, autoTopUpEnabled: checked }))
            }
          />
          <Label className="text-xs">Auto top-up</Label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={register.isPending || update.isPending}
        >
          {editId ? "Update swarm canister" : "Register swarm canister"}
        </Button>
        {editId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setEditId(null);
              setForm(emptySwarmInput());
            }}
          >
            Cancel edit
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : targets.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No dynamic swarm canisters registered yet.
        </p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {targets.map((row) => (
            <div
              key={row.target.canisterId}
              className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{row.target.name}</span>
                  <Badge variant="outline">{categoryLabel(row.target.category)}</Badge>
                  {row.target.agentKind ? (
                    <Badge variant="secondary">{row.target.agentKind}</Badge>
                  ) : null}
                  {!row.target.enabled ? (
                    <Badge variant="outline">Disabled</Badge>
                  ) : null}
                </div>
                <CopyableId id={row.target.canisterId} label={row.target.name} />
                <p className="text-[11px] text-muted-foreground">
                  Auto top-up: {row.target.autoTopUpEnabled ? "on" : "off"} ·
                  spent today {formatIcpE8s(row.spentTodayIcpE8s)} /{" "}
                  {formatIcpE8s(row.target.maxIcpPerDayE8s)} ICP
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditId(row.target.canisterId);
                    setForm({
                      name: row.target.name,
                      canisterId: row.target.canisterId,
                      kind: row.target.kind,
                      category: row.target.category,
                      agentKind: row.target.agentKind,
                      enabled: row.target.enabled,
                      autoTopUpEnabled: row.target.autoTopUpEnabled,
                      thresholdCycles: row.target.thresholdCycles,
                      icpPerTopUpE8s: row.target.icpPerTopUpE8s,
                      maxIcpPerDayE8s: row.target.maxIcpPerDayE8s,
                      notes: row.target.notes,
                    });
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void toggleAutoTopUp(row)}
                  disabled={setAutoTopUp.isPending}
                >
                  {row.target.autoTopUpEnabled ? "Disable auto" : "Enable auto"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void handleRemove(row.target.canisterId)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FleetRow({
  entry,
  onTopUp,
}: {
  entry: FleetCanisterEntry;
  onTopUp: (entry: FleetCanisterEntry) => void;
}) {
  const readable = entry.probeStatus === "ok";
  const level = readable ? severity(entry.cyclesBalance) : null;
  const burn = burnStatusLabel(entry.burnPerDay, entry.lastBurnSampleAt);

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-3 px-4">
        <div className="font-medium capitalize">{entry.name}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px]">
            {categoryLabel(entry.category)}
          </Badge>
          {entry.isSwarm ? (
            <Badge variant="secondary" className="text-[10px]">
              Swarm
            </Badge>
          ) : null}
          {entry.agentKind ? (
            <Badge variant="secondary" className="text-[10px]">
              {entry.agentKind}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="py-3 px-2">
        <CopyableId id={entry.canisterId} label={entry.name} />
      </td>
      <td className="py-3 px-4 font-mono text-sm">
        {readable ? formatCycles(entry.cyclesBalance) : "—"}
      </td>
      <td className="py-3 px-4 font-mono text-sm text-muted-foreground">
        {readable ? formatBytes(entry.memorySize) : "—"}
      </td>
      <td className="py-3 px-4 font-mono text-sm" title={burn.title}>
        {readable ? burn.text : "—"}
      </td>
      <td className="py-3 px-4 font-mono text-sm text-muted-foreground">
        {readable ? formatCycles(entry.cumulativeBurned) : "—"}
      </td>
      <td className="py-3 px-4">
        {!readable ? (
          <div className="space-y-1">
            <Badge
              variant="outline"
              className={
                entry.probeStatus === "denied"
                  ? "text-muted-foreground border-border"
                  : "text-amber-600 border-amber-600/40"
              }
            >
              {probeStatusLabel(entry.probeStatus)}
            </Badge>
            {entry.probeMessage ? (
              <p className="text-[10px] text-muted-foreground leading-snug max-w-[200px]">
                {entry.probeMessage}
              </p>
            ) : null}
          </div>
        ) : level === "ok" ? (
          <Badge
            variant="outline"
            className="text-emerald-600 border-emerald-600/40"
          >
            Healthy
          </Badge>
        ) : level === "warning" ? (
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-600/40"
          >
            Low cycles
          </Badge>
        ) : (
          <Badge variant="destructive">Critical</Badge>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => onTopUp(entry)}
          data-ocid={`admin-topup-${entry.name}`}
        >
          Top up
        </Button>
      </td>
    </tr>
  );
}

function AutoTopUpPanel({ policy }: { policy: FleetAutoTopUpPolicy | null }) {
  const setPolicy = useSetFleetAutoTopUpPolicy();
  const runNow = useAdminRunFleetAutoTopUp();
  const [enabled, setEnabled] = useState(false);
  const [thresholdT, setThresholdT] = useState("0.5");
  const [icpPerTopUp, setIcpPerTopUp] = useState("0.1");
  const [maxIcpPerDay, setMaxIcpPerDay] = useState("1");

  useEffect(() => {
    if (!policy) return;
    setEnabled(policy.enabled);
    setThresholdT((Number(policy.thresholdCycles) / 1e12).toString());
    setIcpPerTopUp(formatIcpE8s(policy.icpPerTopUpE8s));
    setMaxIcpPerDay(formatIcpE8s(policy.maxIcpPerDayE8s));
  }, [policy]);

  async function savePolicy() {
    try {
      const thresholdCycles = BigInt(
        Math.round(parseFloat(thresholdT || "0.5") * 1e12),
      );
      const icpPerTopUpE8s = BigInt(
        Math.round(parseFloat(icpPerTopUp || "0.1") * 1e8),
      );
      const maxIcpPerDayE8s = BigInt(
        Math.round(parseFloat(maxIcpPerDay || "1") * 1e8),
      );
      await setPolicy.mutateAsync({
        enabled,
        thresholdCycles,
        icpPerTopUpE8s,
        maxIcpPerDayE8s,
      });
      toast.success("Auto top-up policy saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save policy");
    }
  }

  async function handleRunNow() {
    try {
      const count = await runNow.mutateAsync();
      toast.success(
        count > 0n
          ? `Auto top-up ran for ${count} canister(s)`
          : "No canisters needed top-up",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto top-up failed");
    }
  }

  return (
    <section
      className="rounded-xl border border-border p-4 space-y-4"
      data-ocid="admin-auto-topup-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Automatic top-up
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Timer checks every 6 hours. Uses treasury ICP when balance falls
            below threshold.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="auto-topup-enabled" className="text-xs">
            Enabled
          </Label>
          <Switch
            id="auto-topup-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Threshold (T cycles)</Label>
          <Input
            value={thresholdT}
            onChange={(e) => setThresholdT(e.target.value)}
            className="h-9 font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">ICP per top-up</Label>
          <Input
            value={icpPerTopUp}
            onChange={(e) => setIcpPerTopUp(e.target.value)}
            className="h-9 font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Max ICP / day</Label>
          <Input
            value={maxIcpPerDay}
            onChange={(e) => setMaxIcpPerDay(e.target.value)}
            className="h-9 font-mono text-sm"
          />
        </div>
      </div>

      {policy ? (
        <p className="text-[11px] text-muted-foreground">
          Spent today: {formatIcpE8s(policy.spentTodayIcpE8s)} /{" "}
          {formatIcpE8s(policy.maxIcpPerDayE8s)} ICP
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void savePolicy()}
          disabled={setPolicy.isPending}
        >
          {setPolicy.isPending ? "Saving…" : "Save policy"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handleRunNow()}
          disabled={runNow.isPending}
        >
          {runNow.isPending ? "Running…" : "Run auto top-up now"}
        </Button>
      </div>
    </section>
  );
}

function LpFeeCyclesPanel() {
  const { data: config } = useLpFeeCyclesConfig();
  const { data: events = [] } = useLpFeeCyclesEvents(5);
  const setConfig = useSetLpFeeCyclesConfig();
  const dryRun = usePreviewLpFeeCyclesDryRun();
  const runFunding = useAdminRunLpFeeCyclesFunding();

  const [enabled, setEnabled] = useState(false);
  const [spicyLedgerId, setSpicyLedgerId] = useState("");
  const [swapPoolId, setSwapPoolId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [icpIsToken0, setIcpIsToken0] = useState(true);
  const [positionOwner, setPositionOwner] = useState("");
  const [intervalDays, setIntervalDays] = useState("30");
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setSpicyLedgerId(config.spicyLedgerId ?? "");
    setSwapPoolId(config.swapPoolId ?? "");
    setPositionId(config.positionId != null ? config.positionId.toString() : "");
    setIcpIsToken0(config.icpIsToken0);
    setPositionOwner(config.positionOwnerPrincipal ?? "");
    setIntervalDays(config.intervalDays.toString());
  }, [config]);

  async function saveConfig() {
    try {
      await setConfig.mutateAsync({
        enabled,
        spicyLedgerId: spicyLedgerId.trim() || null,
        swapPoolId: swapPoolId.trim() || null,
        positionId: positionId.trim() ? BigInt(positionId.trim()) : null,
        icpIsToken0,
        positionOwnerPrincipal: positionOwner.trim() || null,
        intervalDays: BigInt(Math.max(7, parseInt(intervalDays || "30", 10) || 30)),
      });
      toast.success("LP fee funding config saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save config");
    }
  }

  async function handleDryRun() {
    try {
      const result = await dryRun.mutateAsync();
      setDryRunResult(result.message);
      toast.message("Dry run complete", { description: result.message });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dry run failed");
    }
  }

  async function handleRunFunding() {
    try {
      const result = await runFunding.mutateAsync(false);
      toast.success(result.message);
      setDryRunResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Funding run failed");
    }
  }

  return (
    <section
      className="rounded-xl border border-border p-4 space-y-4"
      data-ocid="admin-lp-fee-cycles-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            Monthly LP infrastructure funding
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            After LGE: enter ICPSwap pool + position IDs, then enable. Harvests{" "}
            <strong>ICP LP fees only</strong> (SPICY fees skipped), splits across
            the fleet, and logs a public marketing event.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="lp-fee-enabled" className="text-xs">
            Enabled
          </Label>
          <Switch
            id="lp-fee-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">SPICY ledger ID (optional)</Label>
          <Input
            value={spicyLedgerId}
            onChange={(e) => setSpicyLedgerId(e.target.value)}
            placeholder="Post-LGE ICRC-1 canister"
            className="h-9 font-mono text-[11px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">SPICY/ICP SwapPool ID</Label>
          <Input
            value={swapPoolId}
            onChange={(e) => setSwapPoolId(e.target.value)}
            placeholder="ICPSwap pool canister"
            className="h-9 font-mono text-[11px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">LP position ID</Label>
          <Input
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            placeholder="Nat position id"
            className="h-9 font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Position owner principal</Label>
          <Input
            value={positionOwner}
            onChange={(e) => setPositionOwner(e.target.value)}
            placeholder="Must be backend for auto-claim"
            className="h-9 font-mono text-[11px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Interval (days)</Label>
          <Input
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            className="h-9 font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5 flex flex-col justify-end">
          <Label className="text-xs">ICP is token0 in pool</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch checked={icpIsToken0} onCheckedChange={setIcpIsToken0} />
            <span className="text-xs text-muted-foreground">
              {icpIsToken0 ? "ICP = token0" : "ICP = token1"}
            </span>
          </div>
        </div>
      </div>

      {config?.lastRunAt && config.lastRunAt > 0n ? (
        <p className="text-[11px] text-muted-foreground">
          Last run:{" "}
          {new Date(Number(config.lastRunAt / 1_000_000n)).toLocaleString()}
        </p>
      ) : null}

      {dryRunResult ? (
        <p className="text-xs rounded-lg bg-muted/40 border border-border p-3">
          {dryRunResult}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void saveConfig()} disabled={setConfig.isPending}>
          {setConfig.isPending ? "Saving…" : "Save config"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handleDryRun()}
          disabled={dryRun.isPending}
        >
          {dryRun.isPending ? "Checking…" : "Preview fees (dry run)"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void handleRunFunding()}
          disabled={runFunding.isPending}
        >
          {runFunding.isPending ? "Running…" : "Run funding event now"}
        </Button>
      </div>

      {events.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium">Recent public events</p>
          <div className="rounded-lg border border-border divide-y divide-border text-[11px]">
            {events.map((ev, i) => (
              <div key={`${ev.ts}-${i}`} className="p-2.5 space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {new Date(Number(ev.ts / 1_000_000n)).toLocaleDateString()}{" "}
                    · {ev.trigger}
                  </span>
                  <Badge variant={ev.success ? "outline" : "destructive"}>
                    {ev.success ? "OK" : "Failed"}
                  </Badge>
                </div>
                <p>
                  {formatIcpE8s(ev.icpHarvestedE8s)} ICP →{" "}
                  {formatCyclesShort(ev.totalCyclesMinted)} cycles (
                  {ev.canistersToppedUp.toString()} canisters)
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function fleetErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Failed to query canister health.";
}

export function AdminCanisterHealthBanner() {
  const { data: report } = useFleetCanisterHealth();
  const fleet = report?.canisters ?? [];
  const readable = fleet.filter((e) => e.probeStatus === "ok");

  const alert = useMemo(() => {
    const critical = readable.filter(
      (e) => severity(e.cyclesBalance) === "critical",
    );
    const warning = readable.filter(
      (e) => severity(e.cyclesBalance) === "warning",
    );
    if (critical.length > 0) {
      return {
        level: "critical" as const,
        names: critical.map((e) => e.name).join(", "),
      };
    }
    if (warning.length > 0) {
      return {
        level: "warning" as const,
        names: warning.map((e) => e.name).join(", "),
      };
    }
    return null;
  }, [readable]);

  if (!alert) return null;

  if (alert.level === "critical") {
    return (
      <div
        className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4"
        data-ocid="admin-cycles-critical-banner"
      >
        <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-destructive text-sm">
            Critical: cycles below 0.5T
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Canisters affected: {alert.names}. Top up immediately or the
            canister may freeze and stop accepting calls.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
      data-ocid="admin-cycles-warning-banner"
    >
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
          Warning: cycles below 1T
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Canisters affected: {alert.names}. Consider topping up before
          consumption triggers the freezing threshold.
        </p>
      </div>
    </div>
  );
}

export function AdminCanisterHealthTab() {
  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isSuccess,
  } = useFleetCanisterHealth();
  const fleet = report?.canisters ?? [];
  const appBurnPerDay = report?.appBurnPerDay ?? 0n;
  const appCumulativeBurned = report?.appCumulativeBurned ?? 0n;
  const { data: autoPolicy } = useFleetAutoTopUpPolicy();
  const [topUpEntry, setTopUpEntry] = useState<FleetCanisterEntry | null>(
    null,
  );

  const deniedCount = fleet.filter((e) => e.probeStatus === "denied").length;
  const errorCount = fleet.filter((e) => e.probeStatus === "error").length;
  const okCount = fleet.filter((e) => e.probeStatus === "ok").length;

  return (
    <div className="space-y-6" data-ocid="admin-canister-health-tab">
      <AdminCanisterHealthBanner />

      {isSuccess && deniedCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {deniedCount} canister{deniedCount === 1 ? "" : "s"} show{" "}
            <strong className="font-medium text-foreground">No access</strong>{" "}
            — add the backend canister (
            <code className="font-mono text-[10px]">ghxmp-xiaaa-aaaao-ba4sq-cai</code>
            ) as a controller on those canisters to read cycles via{" "}
            <code className="font-mono text-[10px]">canister_status</code>.
          </p>
        </div>
      ) : null}

      {isSuccess && errorCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {errorCount} probe{errorCount === 1 ? "" : "s"} failed — check
            canister IDs or deploy{" "}
            <code className="font-mono text-[10px]">getCanisterHealth</code> on
            Motoko canisters.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            Canister Health
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cycles balance and memory for all production canisters ({okCount}/
            {fleet.length || 8} readable). Warning below 1T; critical below
            0.5T.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 self-start sm:self-auto"
          data-ocid="admin-refresh-canister-health"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {isSuccess ? (
        <div className="space-y-3" data-ocid="admin-fleet-burn-totals">
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border bg-muted/20 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                App burn / day
              </p>
              <p className="font-display text-lg font-semibold tabular-nums mt-1">
                {appBurnPerDay > 0n
                  ? `${formatCycles(appBurnPerDay)}/day`
                  : burnStatusLabel(
                      0n,
                      fleet.find((e) => e.lastBurnSampleAt > 0n)
                        ?.lastBurnSampleAt ?? 0n,
                    ).text}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Observed from balance deltas (≥1h between samples; 6h timer).
                Top-ups excluded.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                App cumulative burned
              </p>
              <p className="font-display text-lg font-semibold tabular-nums mt-1">
                {formatCycles(appCumulativeBurned)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Since burn tracking started on this backend.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p className="font-medium text-foreground text-sm">How to fund cycles</p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Direct:</strong> copy a
                canister ID (click the ID cell) and send cycles to that principal
                from NNS / dfx / another wallet.
              </li>
              <li>
                <strong className="text-foreground">Admin Top up → Wallet:</strong>{" "}
                sends from cycles wallet{" "}
                <CopyableId id={CYCLES_WALLET_ID} label="cycles wallet" />
              </li>
              <li>
                <strong className="text-foreground">Admin Top up → Treasury ICP</strong>{" "}
                or <strong className="text-foreground">Automatic top-up</strong>:
                mints cycles via CMC onto the target canister (no separate
                “funding canister” — each canister is topped up directly).
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2.5 px-4 font-medium">Canister</th>
              <th className="py-2.5 px-4 font-medium">ID</th>
              <th className="py-2.5 px-4 font-medium">Cycles</th>
              <th className="py-2.5 px-4 font-medium">
                <span className="inline-flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  Memory
                </span>
              </th>
              <th className="py-2.5 px-4 font-medium">Burn / day</th>
              <th className="py-2.5 px-4 font-medium">Cumulative</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="py-3 px-4">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={8} className="py-8 px-4 text-center">
                  <p className="text-destructive text-sm font-medium">
                    {fleetErrorMessage(error)}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="mt-3 gap-1.5"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </td>
              </tr>
            ) : isSuccess && fleet.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 px-4 text-center text-muted-foreground"
                >
                  No canisters returned.
                </td>
              </tr>
            ) : (
              fleet.map((entry) => (
                <FleetRow
                  key={entry.canisterId}
                  entry={entry}
                  onTopUp={setTopUpEntry}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <SwarmCanistersPanel />

      <AutoTopUpPanel policy={autoPolicy ?? null} />

      <LpFeeCyclesPanel />

      <TopUpDialog
        entry={topUpEntry}
        open={topUpEntry != null}
        onOpenChange={(open) => {
          if (!open) setTopUpEntry(null);
        }}
        onSuccess={() => void refetch()}
      />

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Set a 7-day freezing threshold on mainnet after deploy:{" "}
        <code className="font-mono bg-muted px-1 rounded">
          dfx canister --network ic update-settings backend --freezing-threshold
          604800
        </code>
        . Run weekly backups with{" "}
        <code className="font-mono bg-muted px-1 rounded">
          node scripts/backup-data.mjs --network ic
        </code>
        .
      </p>
    </div>
  );
}

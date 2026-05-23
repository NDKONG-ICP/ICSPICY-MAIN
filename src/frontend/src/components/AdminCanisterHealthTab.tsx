import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Cpu,
  HardDrive,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useMemo } from "react";
import {
  useFleetCanisterHealth,
  type FleetCanisterEntry,
} from "../hooks/useBackend";

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

function FleetRow({ entry }: { entry: FleetCanisterEntry }) {
  const level = severity(entry.cyclesBalance);
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-3 pr-4 font-medium capitalize">{entry.name}</td>
      <td className="py-3 pr-4 font-mono text-[11px] text-muted-foreground max-w-[140px] truncate">
        {entry.canisterId}
      </td>
      <td className="py-3 pr-4 font-mono text-sm">
        {formatCycles(entry.cyclesBalance)}
      </td>
      <td className="py-3 pr-4 font-mono text-sm text-muted-foreground">
        {formatBytes(entry.memorySize)}
      </td>
      <td className="py-3">
        {level === "ok" && (
          <Badge variant="outline" className="text-emerald-600 border-emerald-600/40">
            Healthy
          </Badge>
        )}
        {level === "warning" && (
          <Badge variant="outline" className="text-amber-600 border-amber-600/40">
            Low cycles
          </Badge>
        )}
        {level === "critical" && (
          <Badge variant="destructive">Critical</Badge>
        )}
      </td>
    </tr>
  );
}

export function AdminCanisterHealthBanner() {
  const { data: fleet = [] } = useFleetCanisterHealth();

  const alert = useMemo(() => {
    const critical = fleet.filter((e) => severity(e.cyclesBalance) === "critical");
    const warning = fleet.filter((e) => severity(e.cyclesBalance) === "warning");
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
  }, [fleet]);

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
            Canisters affected: {alert.names}. Top up immediately or the canister
            may freeze and stop accepting calls.
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
          Canisters affected: {alert.names}. Consider topping up before consumption
          triggers the freezing threshold.
        </p>
      </div>
    </div>
  );
}

export function AdminCanisterHealthTab() {
  const { data: fleet = [], isLoading, refetch, isFetching } =
    useFleetCanisterHealth();

  return (
    <div className="space-y-6" data-ocid="admin-canister-health-tab">
      <AdminCanisterHealthBanner />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            Canister Health
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cycles balance and memory for all production canisters. Warning below
            1T cycles; critical below 0.5T.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
          data-ocid="admin-refresh-canister-health"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
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
              <th className="py-2.5 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="px-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="py-3 px-4">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))
            ) : fleet.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No health data — sign in as admin to query fleet status.
                </td>
              </tr>
            ) : (
              fleet.map((entry) => (
                <FleetRow key={entry.canisterId} entry={entry} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Set a 7-day freezing threshold on mainnet after deploy:{" "}
        <code className="font-mono bg-muted px-1 rounded">
          dfx canister --network ic update-settings backend --freezing-threshold 604800
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

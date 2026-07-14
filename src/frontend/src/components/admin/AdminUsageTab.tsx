import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

interface DailyFeatureStat {
  day: bigint;
  feature: string;
  action: string;
  count: bigint;
  uniqueUsers: bigint;
}

interface DayAgg {
  date: string;
  totalEvents: number;
  uniqueUsers: number;
  garden: number;
  nims: number;
  shop: number;
  cookbook: number;
  spicyai: number;
  community: number;
  dao: number;
  games: number;
  masterclass: number;
  share: number;
}

const FEATURE_COLORS: Record<string, string> = {
  garden: "#ef4444",
  nims: "#22c55e",
  shop: "#f59e0b",
  cookbook: "#8b5cf6",
  spicyai: "#06b6d4",
  community: "#ec4899",
  dao: "#64748b",
  games: "#f97316",
  masterclass: "#a855f7",
  share: "#14b8a6",
};

const FEATURE_KEYS = [
  "garden",
  "nims",
  "shop",
  "cookbook",
  "spicyai",
  "community",
  "dao",
  "games",
  "masterclass",
  "share",
] as const;

type FeatureKey = (typeof FEATURE_KEYS)[number];

function isFeatureKey(feature: string): feature is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(feature);
}

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

function bucketToDate(bucket: number): string {
  const ms = bucket * 86400 * 1000;
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AdminUsageTab() {
  const { actor } = useAuth();
  const [stats, setStats] = useState<DailyFeatureStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);

  const fetchStats = useCallback(async () => {
    if (!actor) {
      setError("Sign in as admin to view usage analytics.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await actor.getUsageRollups(BigInt(days));
      setStats(result as DailyFeatureStat[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage data");
    } finally {
      setLoading(false);
    }
  }, [actor, days]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const chartData = useMemo(() => {
    const map = new Map<number, DayAgg>();

    for (const s of stats) {
      const day = Number(s.day);
      const feature = s.feature;
      const count = Number(s.count);
      const unique = Number(s.uniqueUsers);

      if (!map.has(day)) {
        map.set(day, {
          date: bucketToDate(day),
          totalEvents: 0,
          uniqueUsers: 0,
          garden: 0,
          nims: 0,
          shop: 0,
          cookbook: 0,
          spicyai: 0,
          community: 0,
          dao: 0,
          games: 0,
          masterclass: 0,
          share: 0,
        });
      }
      const agg = map.get(day)!;
      agg.totalEvents += count;
      agg.uniqueUsers = Math.max(agg.uniqueUsers, unique);
      if (isFeatureKey(feature)) {
        agg[feature] += count;
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v);
  }, [stats]);

  const totalEvents = stats.reduce((s, r) => s + Number(r.count), 0);
  const peakUniqueUsers = chartData.reduce(
    (max, d) => Math.max(max, d.uniqueUsers),
    0,
  );

  const featureTotals = FEATURE_KEYS.map((f) => ({
    feature: f,
    total: stats
      .filter((s) => s.feature === f)
      .reduce((s, r) => s + Number(r.count), 0),
  })).sort((a, b) => b.total - a.total);

  const totalForPct = featureTotals.reduce((s, f) => s + f.total, 0) || 1;

  if (loading) {
    return (
      <div className="space-y-4" data-ocid="admin-usage-loading">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        data-ocid="admin-usage-error"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="admin-usage-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-xl">
            Usage Analytics
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Last</span>
          {DAY_OPTIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
              data-ocid={`admin-usage-days-${d}`}
            >
              {d}d
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void fetchStats()}
            data-ocid="admin-usage-refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: totalEvents.toLocaleString() },
          {
            label: "Peak Daily Users",
            value: peakUniqueUsers.toLocaleString(),
          },
          {
            label: "Active Features",
            value: featureTotals.filter((f) => f.total > 0).length,
          },
          { label: "Days Tracked", value: days },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-display font-semibold mt-1">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-4">
          Daily Events + Unique Users
        </h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No usage data yet. Events appear once authenticated users interact
            with the app.
          </p>
        ) : (
          <ChartContainer
            config={{
              totalEvents: { label: "Events", color: "#ef4444" },
              uniqueUsers: { label: "Unique Users", color: "#22c55e" },
            }}
            className="h-[240px] w-full"
          >
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalEvents"
                stroke="#ef4444"
                name="Events"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="uniqueUsers"
                stroke="#22c55e"
                name="Unique Users"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-4">
          Events by Feature (Daily)
        </h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No data yet.
          </p>
        ) : (
          <ChartContainer config={{}} className="h-[240px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {FEATURE_KEYS.map((f) => (
                <Bar
                  key={f}
                  dataKey={f}
                  stackId="a"
                  fill={FEATURE_COLORS[f]}
                  name={f}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-4">Feature Totals</h3>
        <div className="space-y-3">
          {featureTotals.map(({ feature, total }) => (
            <div key={feature} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: FEATURE_COLORS[feature] ?? "#6b7280",
                }}
              />
              <div className="w-24 text-sm capitalize text-muted-foreground">
                {feature}
              </div>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(total / totalForPct) * 100}%`,
                    backgroundColor: FEATURE_COLORS[feature] ?? "#6b7280",
                  }}
                />
              </div>
              <div className="w-16 text-right text-sm font-mono">
                {total.toLocaleString()}
              </div>
              <div className="w-12 text-right text-xs text-muted-foreground">
                {((total / totalForPct) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Usage data is stored on-chain as daily rollups. Principal identifiers
        are truncated — never stored in full.
      </p>
    </div>
  );
}

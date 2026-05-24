import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import {
  buildWeatherHistory,
  weatherHistoryToCsv,
  type WeatherDateRange,
  type WeatherHistoryPoint,
} from "@/lib/weather-history";
import type { PlantLifecycle } from "../../declarations/backend.did";
import { ChevronDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { downloadTextFile } from "@/lib/plant-nfc-url";

const RANGE_OPTIONS: { id: WeatherDateRange; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

const CHART_ANIMATION = { isAnimationActive: true, animationDuration: 1400, animationEasing: "ease-out" as const };

type ChartRow = WeatherHistoryPoint & {
  label: string;
  waterDot: number | null;
  feedDot: number | null;
  pestDot: number | null;
};

function formatChartDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function uvFill(uv: number): string {
  if (uv >= 8) return "#ef4444";
  if (uv >= 6) return "#f97316";
  if (uv >= 3) return "#eab308";
  return "#22c55e";
}

function activitySummary(row: ChartRow): string[] {
  const items: string[] = [];
  if (row.watered) items.push("💧 Watered");
  if (row.fed) items.push("🧪 Fed");
  if (row.pestLogged) items.push("🐛 Pest logged");
  return items;
}

function WeatherHistoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const activities = activitySummary(row);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur-md">
      <p className="mb-2 font-semibold text-amber-200">{formatFullDate(row.date)}</p>
      <div className="grid gap-1 text-zinc-300">
        <span>
          <span className="text-red-400">High</span> {row.highF.toFixed(0)}°F ·{" "}
          <span className="text-blue-400">Low</span> {row.lowF.toFixed(0)}°F
        </span>
        <span>💧 Humidity {row.humidity.toFixed(0)}% · 🌧️ {row.rainInches.toFixed(2)}&quot;</span>
        <span>☀️ UV {row.uvIndex.toFixed(1)} · 🌬️ {row.windMph?.toFixed(0) ?? "—"} mph</span>
        {row.aqi != null && <span>🫁 AQI {row.aqi}</span>}
        {row.moonPhase && <span>🌙 {row.moonPhase}</span>}
      </div>
      {activities.length > 0 ? (
        <div className="mt-2 border-t border-white/10 pt-2">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Logged</p>
          <ul className="space-y-0.5 text-zinc-200">
            {activities.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 border-t border-white/10 pt-2 text-zinc-500">No care logs this day</p>
      )}
    </div>
  );
}

function ActivityDot({
  cx,
  cy,
  emoji,
  color,
}: {
  cx?: number;
  cy?: number;
  emoji: string;
  color: string;
}) {
  if (cx == null || cy == null) return <g />;
  return (
    <g className="cursor-pointer">
      <circle cx={cx} cy={cy} r={12} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11}>
        {emoji}
      </text>
    </g>
  );
}

export function WeatherHistoryCharts({
  lifecycle,
}: {
  lifecycle: PlantLifecycle;
}) {
  const [range, setRange] = useState<WeatherDateRange>("30d");
  const [tableOpen, setTableOpen] = useState(false);

  const points = useMemo(
    () => buildWeatherHistory(lifecycle, range),
    [lifecycle, range],
  );

  const chartData = useMemo<ChartRow[]>(
    () =>
      points.map((p) => ({
        ...p,
        label: formatChartDate(p.date),
        waterDot: p.watered ? p.highF : null,
        feedDot: p.fed ? p.humidity : null,
        pestDot: p.pestLogged ? p.uvIndex : null,
      })),
    [points],
  );

  if (points.length === 0) {
    return (
      <div
        data-ocid="weather-history-empty"
        className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
      >
        No weather snapshots yet. Log watering, feeding, or notes to capture local
        weather with each entry.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="weather-history-charts">
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant={range === opt.id ? "default" : "outline"}
            onClick={() => setRange(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 backdrop-blur-sm">
        <h3 className="mb-3 font-display font-semibold text-foreground">Temperature (°F)</h3>
        <ChartContainer
          config={{
            highF: { label: "High", color: "#ef4444" },
            lowF: { label: "Low", color: "#60a5fa" },
          }}
          className="h-[240px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tempHighGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tempLowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} unit="°" axisLine={false} tickLine={false} />
              <Tooltip content={<WeatherHistoryTooltip />} cursor={{ stroke: "#ef4444", strokeOpacity: 0.3 }} />
              <Area
                type="monotone"
                dataKey="highF"
                stroke="#ef4444"
                fill="url(#tempHighGradient)"
                strokeWidth={2.5}
                {...CHART_ANIMATION}
              />
              <Area
                type="monotone"
                dataKey="lowF"
                stroke="#60a5fa"
                fill="url(#tempLowGradient)"
                strokeWidth={2}
                {...CHART_ANIMATION}
              />
              <Line
                type="monotone"
                dataKey="waterDot"
                stroke="transparent"
                isAnimationActive={false}
                dot={(props) => {
                  const { cx, cy, payload } = props as {
                    cx?: number;
                    cy?: number;
                    payload?: ChartRow;
                  };
                  if (!payload?.watered) return <g />;
                  return <ActivityDot cx={cx} cy={cy} emoji="💧" color="#38bdf8" />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="mt-1 text-xs text-muted-foreground">💧 = watering logged · hover for details</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 backdrop-blur-sm">
        <h3 className="mb-3 font-display font-semibold text-foreground">Humidity & Rainfall</h3>
        <ChartContainer
          config={{
            rainInches: { label: "Rain (in)", color: "#3b82f6" },
            humidity: { label: "Humidity %", color: "#fbbf24" },
          }}
          className="h-[240px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rainBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.35} />
                </linearGradient>
                <linearGradient id="humidityLineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#a1a1aa" }} unit='"' axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#a1a1aa" }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip content={<WeatherHistoryTooltip />} cursor={{ fill: "rgba(59,130,246,0.08)" }} />
              <Bar
                yAxisId="left"
                dataKey="rainInches"
                fill="url(#rainBarGradient)"
                radius={[4, 4, 0, 0]}
                {...CHART_ANIMATION}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                stroke="#fbbf24"
                fill="url(#humidityLineGradient)"
                strokeWidth={2}
                {...CHART_ANIMATION}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="feedDot"
                stroke="transparent"
                isAnimationActive={false}
                dot={(props) => {
                  const { cx, cy, payload } = props as {
                    cx?: number;
                    cy?: number;
                    payload?: ChartRow;
                  };
                  if (!payload?.fed) return <g />;
                  return <ActivityDot cx={cx} cy={cy} emoji="🧪" color="#a3e635" />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="mt-1 text-xs text-muted-foreground">🧪 = feeding logged</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 backdrop-blur-sm">
        <h3 className="mb-3 font-display font-semibold text-foreground">UV Index</h3>
        <ChartContainer
          config={{ uvIndex: { label: "UV", color: "#f97316" } }}
          className="h-[220px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} domain={[0, 12]} axisLine={false} tickLine={false} />
              <ReferenceLine y={6} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.6} />
              <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Tooltip content={<WeatherHistoryTooltip />} cursor={{ stroke: "#f97316", strokeOpacity: 0.25 }} />
              <defs>
                <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                  {chartData.map((d, i) => (
                    <stop
                      key={d.date}
                      offset={`${(i / Math.max(chartData.length - 1, 1)) * 100}%`}
                      stopColor={uvFill(d.uvIndex)}
                      stopOpacity={0.55}
                    />
                  ))}
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="uvIndex"
                stroke="#f97316"
                fill="url(#uvGradient)"
                strokeWidth={2.5}
                {...CHART_ANIMATION}
              />
              <Line
                type="monotone"
                dataKey="pestDot"
                stroke="transparent"
                isAnimationActive={false}
                dot={(props) => {
                  const { cx, cy, payload } = props as {
                    cx?: number;
                    cy?: number;
                    payload?: ChartRow;
                  };
                  if (!payload?.pestLogged) return <g />;
                  return <ActivityDot cx={cx} cy={cy} emoji="🐛" color="#f87171" />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="mt-1 text-xs text-muted-foreground">🐛 = pest treatment logged</p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
          onClick={() => setTableOpen((o) => !o)}
        >
          Data table
          <ChevronDown
            className={`size-4 transition ${tableOpen ? "rotate-180" : ""}`}
          />
        </button>
        {tableOpen && (
          <div className="border-t border-border p-4">
            <div className="mb-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadTextFile(
                    `plant-${lifecycle.plant.id}-weather.csv`,
                    weatherHistoryToCsv(points),
                  )
                }
              >
                <Download className="mr-2 size-4" />
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">High</th>
                    <th className="py-2 pr-3">Low</th>
                    <th className="py-2 pr-3">Humidity</th>
                    <th className="py-2 pr-3">Rain</th>
                    <th className="py-2 pr-3">UV</th>
                    <th className="py-2 pr-3">Wind</th>
                    <th className="py-2 pr-3">AQI</th>
                    <th className="py-2">Moon</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <WeatherTableRow key={p.date} point={p} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WeatherTableRow({ point: p }: { point: WeatherHistoryPoint }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-3 font-mono">{p.date}</td>
      <td className="py-2 pr-3">{p.highF.toFixed(0)}°F</td>
      <td className="py-2 pr-3">{p.lowF.toFixed(0)}°F</td>
      <td className="py-2 pr-3">{p.humidity.toFixed(0)}%</td>
      <td className="py-2 pr-3">{p.rainInches.toFixed(2)}&quot;</td>
      <td className="py-2 pr-3">{p.uvIndex.toFixed(1)}</td>
      <td className="py-2 pr-3">{p.windMph?.toFixed(0) ?? "—"}</td>
      <td className="py-2 pr-3">{p.aqi ?? "—"}</td>
      <td className="py-2">{p.moonPhase ?? "—"}</td>
    </tr>
  );
}

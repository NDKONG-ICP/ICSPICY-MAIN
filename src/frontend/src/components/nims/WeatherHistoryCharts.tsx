import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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

function formatChartDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function uvFill(uv: number): string {
  if (uv >= 8) return "#ef4444";
  if (uv >= 6) return "#f97316";
  if (uv >= 3) return "#eab308";
  return "#22c55e";
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

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        label: formatChartDate(p.date),
        waterDot: p.watered ? p.highF : null,
        feedDot: p.fed ? p.humidity : null,
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

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-display font-semibold">Temperature (°F)</h3>
        <ChartContainer
          config={{
            highF: { label: "High", color: "#ef4444" },
            lowF: { label: "Low", color: "#3b82f6" },
          }}
          className="h-[240px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="°" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="highF"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="lowF"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="waterDot"
                stroke="transparent"
                dot={(props) => {
                  const { cx, cy, payload } = props as {
                    cx?: number;
                    cy?: number;
                    payload?: { watered?: boolean };
                  };
                  if (!payload?.watered || cx == null || cy == null) {
                    return <g />;
                  }
                  return (
                    <text x={cx} y={cy - 8} textAnchor="middle" fontSize={14}>
                      💧
                    </text>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="mt-1 text-xs text-muted-foreground">💧 = watering logged</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-display font-semibold">Humidity & Rainfall</h3>
        <ChartContainer
          config={{
            rainInches: { label: "Rain (in)", color: "#3b82f6" },
            humidity: { label: "Humidity %", color: "#22c55e" },
          }}
          className="h-[240px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} unit='"' />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar yAxisId="left" dataKey="rainInches" fill="#3b82f6" fillOpacity={0.7} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="feedDot"
                stroke="transparent"
                dot={(props) => {
                  const { cx, cy, payload } = props as {
                    cx?: number;
                    cy?: number;
                    payload?: { fed?: boolean };
                  };
                  if (!payload?.fed || cx == null || cy == null) {
                    return <g />;
                  }
                  return (
                    <text x={cx} y={cy - 8} textAnchor="middle" fontSize={14}>
                      🧪
                    </text>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="mt-1 text-xs text-muted-foreground">🧪 = feeding logged</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-display font-semibold">UV Index</h3>
        <ChartContainer
          config={{ uvIndex: { label: "UV", color: "#f97316" } }}
          className="h-[220px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 12]} />
              <ReferenceLine y={6} stroke="#f97316" strokeDasharray="4 4" label="High" />
              <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="4 4" label="Very high" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                  {chartData.map((d, i) => (
                    <stop
                      key={d.date}
                      offset={`${(i / Math.max(chartData.length - 1, 1)) * 100}%`}
                      stopColor={uvFill(d.uvIndex)}
                      stopOpacity={0.5}
                    />
                  ))}
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="uvIndex"
                stroke="#f97316"
                fill="url(#uvGradient)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
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
